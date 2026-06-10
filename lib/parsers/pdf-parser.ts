import "server-only";

// pdf-parse@1.1.1 internal parser entrypoint
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse";

export interface ParsedPdf {
  text: string;
  metadata: {
    pageCount: number;
    info?: Record<string, unknown>;
  };
}

interface PdfParseResult {
  text: string;
  numpages: number;
  info?: unknown;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const result = (await pdf(buffer)) as PdfParseResult;

  return {
    text: result.text ?? "",
    metadata: {
      pageCount: result.numpages ?? 0,
      info:
        result.info && typeof result.info === "object"
          ? (result.info as Record<string, unknown>)
          : undefined,
    },
  };
}