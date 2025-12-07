import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { addTrack } from "@/lib/music-store"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/mp4",
            "audio/x-m4a",
            "audio/aac",
            "audio/flac",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[v0] Upload completed:", blob.pathname)

        const filename = blob.pathname.split("/").pop() || "Unknown"
        const track = addTrack({
          title: filename.replace(/\.[^/.]+$/, "").replace(/-[a-z0-9]{8}$/i, ""), // Remove extension and random suffix
          artist: "Unknown Artist",
          url: blob.url,
        })

        console.log("[v0] Track registered:", track.title)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
