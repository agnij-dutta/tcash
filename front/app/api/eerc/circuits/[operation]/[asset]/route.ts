import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Absolute repo root based on workspace path
const REPO_ROOT = "/home/agnij/Desktop/tcash";
const DEPS_ROOT = path.join(REPO_ROOT, "deps", "eerc-backend-converter", "circom", "build");

function resolveArtifact(operation: string, asset: string): string | null {
  const lowerOp = operation.toLowerCase();
  const lowerAsset = asset.toLowerCase();

  const mapping: Record<string, { wasm: string; zkey: string }> = {
    registration: {
      wasm: path.join(DEPS_ROOT, "registration", "registration.wasm"),
      zkey: path.join(DEPS_ROOT, "registration", "circuit_final.zkey"),
    },
    transfer: {
      wasm: path.join(DEPS_ROOT, "transfer", "transfer.wasm"),
      zkey: path.join(DEPS_ROOT, "transfer", "transfer.zkey"),
    },
    mint: {
      wasm: path.join(DEPS_ROOT, "mint", "mint.wasm"),
      zkey: path.join(DEPS_ROOT, "mint", "mint.zkey"),
    },
    withdraw: {
      wasm: path.join(DEPS_ROOT, "withdraw", "withdraw.wasm"),
      zkey: path.join(DEPS_ROOT, "withdraw", "circuit_final.zkey"),
    },
    burn: {
      wasm: path.join(DEPS_ROOT, "burn", "burn.wasm"),
      zkey: path.join(DEPS_ROOT, "burn", "burn.zkey"),
    },
  };

  const entry = mapping[lowerOp];
  if (!entry) return null;
  if (lowerAsset === "wasm") return entry.wasm;
  if (lowerAsset === "zkey") return entry.zkey;
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: { operation: string; asset: string } }
) {
  try {
    const { operation, asset } = ctx.params;
    const filePath = resolveArtifact(operation, asset);
    if (!filePath) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const data = await readFile(filePath);
    const headers = new Headers();
    if (asset.toLowerCase() === "wasm") {
      headers.set("Content-Type", "application/wasm");
      headers.set("Cache-Control", "public, max-age=3600, immutable");
    } else {
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Cache-Control", "public, max-age=3600, immutable");
    }
    return new NextResponse(data, { status: 200, headers });
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}


