"use client";

import { DragEvent, SubmitEventHandler, useMemo, useRef, useState } from "react";

import { UploadedPdf } from "../document_workspace/document_workspace";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

type ChatProps = {
	files: UploadedPdf[];
	activeFileId: string | null;
	onAddFiles: (incomingFiles: FileList | null) => void;
	onRemoveFile: (fileId: string) => void;
	onClearFiles: () => void;
	onSelectFile: (fileId: string) => void;
};

const Chat = ({ files, activeFileId, onAddFiles, onRemoveFile, onClearFiles, onSelectFile }: ChatProps) => {
	const [isDragging, setIsDragging] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fileSummary = useMemo(() => {
		if (!files.length) {
			return "Supports .pdf files";
		}

		if (files.length === 1) {
			return files[0].file.name;
		}

		return `${files.length} PDF files selected`;
	}, [files]);

	const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setIsDragging(false);
		onAddFiles(event.dataTransfer.files);
	};

	const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
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
				: "Please upload a PDF document first to get started. This is a local mock reply. Backend answer generation can be connected next.",
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
					onChange={(event) => onAddFiles(event.target.files)}
				/>
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-2xl text-zinc-500">
					↥
				</div>
				<p className="text-lg font-medium text-black">Drop a PDF here or click to upload</p>
				<p className="mt-1 text-sm text-zinc-600">{fileSummary}</p>
				{files.length > 0 && (
					<div className="mt-4 w-full max-w-md text-left" onClick={(event) => event.stopPropagation()}>
						<div className="mb-2 flex items-center justify-between">
							<p className="text-sm font-medium text-zinc-700">Added documents</p>
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									onClearFiles();
								}}
								className="text-sm text-zinc-600 transition hover:text-zinc-800"
							>
								Clear all
							</button>
						</div>
						<div className="max-h-28 space-y-2 overflow-y-auto">
							{files.map((item) => {
								const isActive = item.id === activeFileId;

								return (
									<div
										key={item.id}
										className={`flex items-center justify-between rounded-md border px-2 py-1 ${
											isActive ? "border-docuery bg-zinc-50" : "border-docuery-light bg-white"
										}`}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											onSelectFile(item.id);
										}}
									>
										<p className="truncate pr-2 text-sm text-zinc-700">{item.file.name}</p>
										<button
											type="button"
											aria-label={`Remove ${item.file.name}`}
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												onRemoveFile(item.id);
											}}
											className="text-sm text-zinc-600 transition hover:text-zinc-800"
										>
											✕
										</button>
									</div>
								);
							})}
						</div>
					</div>
				)}
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
