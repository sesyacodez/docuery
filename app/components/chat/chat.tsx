"use client";

import { DragEvent, FormEvent, useMemo, useRef, useState } from "react";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

const Chat = () => {
	const [files, setFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fileSummary = useMemo(() => {
		if (!files.length) {
			return "Supports .pdf files";
		}

		if (files.length === 1) {
			return files[0].name;
		}

		return `${files.length} PDF files selected`;
	}, [files]);

	const addPdfFiles = (incomingFiles: FileList | null) => {
		if (!incomingFiles) return;

		const pdfFiles = Array.from(incomingFiles).filter(
			(file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
		);

		if (!pdfFiles.length) return;

		setFiles((previous) => {
			const allFiles = [...previous, ...pdfFiles];
			const deduped = Array.from(new Map(allFiles.map((file) => [`${file.name}-${file.size}`, file])).values());
			return deduped;
		});
	};

	const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setIsDragging(false);
		addPdfFiles(event.dataTransfer.files);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = draft.trim();

		if (!trimmed) return;

		const userMessage: ChatMessage = {
			id: `${Date.now()}-user`,
			role: "user",
			text: trimmed,
		};

		const assistantMessage: ChatMessage = {
			id: `${Date.now()}-assistant`,
			role: "assistant",
			text: files.length
				? "Got it. This is a local mock reply. Backend answer generation can be connected next."
				: "Pleae upload a PDF document first to get started. This is a local mock reply. Backend answer generation can be connected next.",
		};

		setMessages((previous) => [...previous, userMessage, assistantMessage]);
		setDraft("");
	};

	return (
		<section className="flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 overflow-hidden">
			<label
				className={`flex min-h-0 basis-[20%] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-zinc-100 px-6 py-8 text-center transition ${
					isDragging ? "border-docuery bg-white" : "border-docuery-light"
				}`}
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,application/pdf"
					multiple
					className="hidden"
					onChange={(event) => addPdfFiles(event.target.files)}
				/>
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-2xl text-zinc-500">
					↥
				</div>
				<p className="text-lg font-medium text-black">Drop a PDF here or click to upload</p>
				<p className="mt-1 text-sm text-zinc-600">{fileSummary}</p>
			</label>

			<div className="flex min-h-0 basis-[80%] flex-col overflow-hidden rounded-lg border border-docuery-light bg-white">
				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
					{messages.length === 0 ? (
						<p className="text-sm text-zinc-500">Upload a document to begin...</p>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={`max-w-[60%] rounded-md px-3 py-2 text-sm ${
									message.role === "user"
										? "ml-auto bg-docuery text-white"
										: "border border-docuery-light bg-zinc-50 text-zinc-800"
								}`}
							>
								{message.text}
							</div>
						))
					)}
				</div>

				<form onSubmit={handleSubmit} className="border-t border-docuery-light bg-zinc-50 p-2">
					<div className="flex items-center gap-2 rounded-md border border-docuery-light bg-white px-2 py-1">
						<input
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							placeholder="Upload a document to begin..."
							className="w-full bg-transparent px-1 py-2 text-sm outline-none"
						/>
						<button
							type="submit"
							disabled={!draft.trim()}
							className="rounded-md bg-docuery px-3 py-2 text-sm text-white transition hover:bg-docuery-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							➤
						</button>
					</div>
				</form>
			</div>
		</section>
	);
};

export default Chat;
