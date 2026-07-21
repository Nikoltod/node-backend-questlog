import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

const REQUEST_ID_HEADER = "x-request-id";

const VALID_REQUEST_ID_PATTERN =
    /^[A-Za-z0-9._-]{1,100}$/;

function readRequestIdHeader(
    request: IncomingMessage,
): string | undefined {
    const headerValue =
        request.headers[REQUEST_ID_HEADER];

    if (Array.isArray(headerValue)) {
        return headerValue[0];
    }

    return headerValue;
}

export function generateRequestId(
    request: IncomingMessage,
): string {
    const suppliedRequestId =
        readRequestIdHeader(request);

    if (
        suppliedRequestId &&
        VALID_REQUEST_ID_PATTERN.test(suppliedRequestId)
    ) {
        return suppliedRequestId;
    }

    return randomUUID();
}