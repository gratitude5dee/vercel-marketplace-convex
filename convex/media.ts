import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireWorkspaceMembership } from "./lib/authz";

const mediaViewValidator = v.object({
  mediaId: v.id("mediaAssets"),
  sessionId: v.id("sessions"),
  callId: v.string(),
  contentType: v.string(),
  durationMs: v.optional(v.number()),
  createdAt: v.number(),
  url: v.union(v.string(), v.null()),
  transcriptSnapshotUrl: v.optional(v.union(v.string(), v.null())),
});

const internalApi = internal as any;

export const listBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.array(mediaViewValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    await requireWorkspaceMembership(ctx, session.workspaceId);

    const mediaAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    return await Promise.all(
      mediaAssets.map(async (media) => ({
        mediaId: media._id,
        sessionId: media.sessionId,
        callId: media.callId,
        contentType: media.contentType,
        durationMs: media.durationMs,
        createdAt: media.createdAt,
        url: await ctx.storage.getUrl(media.storageId),
        transcriptSnapshotUrl: media.transcriptSnapshotStorageId
          ? await ctx.storage.getUrl(media.transcriptSnapshotStorageId)
          : undefined,
      })),
    );
  },
});

export const saveAsset = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    callId: v.string(),
    storageId: v.id("_storage"),
    contentType: v.string(),
    durationMs: v.optional(v.number()),
    transcriptSnapshotStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("mediaAssets"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("mediaAssets", {
      sessionId: args.sessionId,
      callId: args.callId,
      storageId: args.storageId,
      contentType: args.contentType,
      durationMs: args.durationMs,
      transcriptSnapshotStorageId: args.transcriptSnapshotStorageId,
      createdAt: Date.now(),
    });
  },
});

async function storeBlobFromUrl(url: string, fallbackContentType?: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download media from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    blob: new Blob([arrayBuffer], {
      type: response.headers.get("content-type") ?? fallbackContentType ?? "audio/mpeg",
    }),
    contentType: response.headers.get("content-type") ?? fallbackContentType ?? "audio/mpeg",
  };
}

export const persistRecording = internalAction({
  args: {
    sessionId: v.id("sessions"),
    callId: v.string(),
    recordingUrl: v.optional(v.string()),
    recordingBase64: v.optional(v.string()),
    contentType: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    transcriptSnapshotText: v.optional(v.string()),
  },
  returns: v.union(v.id("mediaAssets"), v.null()),
  handler: async (ctx, args) => {
    if (!args.recordingUrl && !args.recordingBase64) {
      return null;
    }

    let recordingBlob: Blob;
    let contentType = args.contentType ?? "audio/mpeg";

    if (args.recordingUrl) {
      const downloaded = await storeBlobFromUrl(args.recordingUrl, args.contentType);
      recordingBlob = downloaded.blob;
      contentType = downloaded.contentType;
    } else {
      const binary = atob(args.recordingBase64 ?? "");
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      recordingBlob = new Blob([bytes], { type: contentType });
    }

    const storageId = await ctx.storage.store(recordingBlob);

    let transcriptSnapshotStorageId;
    if (args.transcriptSnapshotText) {
      const transcriptBlob = new Blob([args.transcriptSnapshotText], {
        type: "text/plain",
      });
      transcriptSnapshotStorageId = await ctx.storage.store(transcriptBlob);
    }

    return await ctx.runMutation(internalApi.media.saveAsset, {
      sessionId: args.sessionId,
      callId: args.callId,
      storageId,
      contentType,
      durationMs: args.durationMs,
      transcriptSnapshotStorageId,
    });
  },
});
