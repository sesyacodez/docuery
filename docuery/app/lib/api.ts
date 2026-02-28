export type ApiDocument = {
	document_id: string;
	filename: string;
	stored_filename: string;
	bytes_size: number;
	uploaded_at: string;
};

type UploadDocumentsResponse = {
	documents: ApiDocument[];
};

type ChatRequest = {
	message: string;
	document_ids: string[];
	history: Array<{ role: "user" | "assistant"; text: string }>;
};

export type ChatResponse = {
	answer: string;
	citations: Array<{
		document_id: string;
		filename: string;
		page: number | null;
		snippet: string;
	}>;
	used_document_ids: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const getFallbackUrl = (path: string): string | null => {
	if (process.env.NEXT_PUBLIC_API_BASE_URL) {
		return null;
	}

	try {
		const url = new URL(buildUrl(path));
		if (url.hostname !== "localhost") {
			return null;
		}

		if (url.port === "8000") {
			url.port = "8001";
			return url.toString();
		}

		if (url.port === "8001") {
			url.port = "8000";
			return url.toString();
		}
	} catch {}

	return null;
};

const performRequest = async (path: string, init: RequestInit): Promise<Response> => {
	const primaryUrl = buildUrl(path);

	try {
		return await fetch(primaryUrl, init);
	} catch (error) {
		const fallbackUrl = getFallbackUrl(path);
		if (!fallbackUrl) {
			throw error;
		}

		return await fetch(fallbackUrl, init);
	}
};

const parseError = async (response: Response) => {
	try {
		const payload = await response.json();
		if (payload?.detail && typeof payload.detail === "string") {
			return payload.detail;
		}
	} catch {}

	return `Request failed with status ${response.status}`;
};

export const uploadDocument = async (file: File): Promise<ApiDocument> => {
	const body = new FormData();
	body.append("files", file);

	const response = await performRequest("/documents/upload", {
		method: "POST",
		body,
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}

	const data = (await response.json()) as UploadDocumentsResponse;

	if (!data.documents.length) {
		throw new Error("Upload succeeded but no document metadata was returned.");
	}

	return data.documents[0];
};

export const deleteDocument = async (documentId: string) => {
	const response = await performRequest(`/documents/${documentId}`, {
		method: "DELETE",
	});

	if (!response.ok && response.status !== 404) {
		throw new Error(await parseError(response));
	}
};

export const clearDocuments = async () => {
	const response = await performRequest("/documents", {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}
};

export const chatWithDocuments = async (request: ChatRequest): Promise<ChatResponse> => {
	const response = await performRequest("/chat", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new Error(await parseError(response));
	}

	return (await response.json()) as ChatResponse;
};
