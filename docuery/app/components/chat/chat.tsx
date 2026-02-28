"use client";

import { DragEvent, SubmitEventHandler, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { chatWithDocuments } from "@/app/lib/api";

import { UploadedPdf } from "../document_workspace/document_workspace";

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

type ChatProps = {
	files: UploadedPdf[];
	activeFileId: string | null;
	onAddFiles: (incomingFiles: FileList | null) => Promise<void>;
	onRemoveFile: (fileId: string) => Promise<void>;
	onClearFiles: () => Promise<void>;
	onSelectFile: (fileId: string) => void;
};

const cleanAssistantMarkdown = (input: string): string => {
	const normalizedBreaks = input
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/^[\t ]*[•·]\s+/gm, "")
		.trim();

	const hasPseudoTable = normalizedBreaks.includes("||") && normalizedBreaks.includes("|");
	const hasMarkdownTable = /\n\s*\|\s*[-:]+\s*\|/.test(normalizedBreaks);

	if (!hasPseudoTable || hasMarkdownTable) {
		return normalizedBreaks;
	}

	const segments = normalizedBreaks
		.split("||")
		.map((segment) => segment.trim())
		.filter(Boolean);

	if (segments.length < 2) {
		return normalizedBreaks;
	}

	const leadingTextMatch = segments[0].match(/^(.*?)(\|.*)$/s);
	const leadingText = leadingTextMatch?.[1]?.trim() ?? "";
	const firstRowSource = leadingTextMatch?.[2] ?? segments[0];

	const parseRow = (source: string): [string, string] | null => {
		const columns = source
			.split("|")
			.map((part) => part.trim().replace(/^[•·]\s+/, ""))
			.filter(Boolean);

		if (columns.length < 2) {
			return null;
		}

		return [columns[0], columns.slice(1).join(" | ")];
	};

	const parsedRows = [firstRowSource, ...segments.slice(1)].map(parseRow).filter((row): row is [string, string] => row !== null);

	if (parsedRows.length < 2) {
		return normalizedBreaks;
	}

	const [header, ...rows] = parsedRows;
	const table = [
		`| ${header[0]} | ${header[1]} |`,
		"| --- | --- |",
		...rows.map(([left, right]) => `| ${left} | ${right} |`),
	].join("\n");

	return [leadingText, table].filter(Boolean).join("\n\n");
};

const Chat = ({ files, activeFileId, onAddFiles, onRemoveFile, onClearFiles, onSelectFile }: ChatProps) => {
	const [isDragging, setIsDragging] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!messagesContainerRef.current) {
			return;
		}

		messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
	}, [messages]);

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
		void onAddFiles(event.dataTransfer.files);
	};

	const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
		event.preventDefault();
		const trimmed = draft.trim();

		if (!trimmed || isSending) return;

		const userMessage: ChatMessage = {
			id: `${Date.now()}-user`,
			role: "user",
			text: trimmed,
		};

		const nextMessages = [...messages, userMessage];
		setMessages(nextMessages);
		setDraft("");

		if (!files.length) {
			setMessages((previous) => [
				...previous,
				{
					id: `${Date.now()}-assistant`,
					role: "assistant",
					text: "Please upload a PDF document first to get started.",
				},
			]);
			return;
		}

		setIsSending(true);

		try {
			const response = await chatWithDocuments({
				message: trimmed,
				document_ids: files.map((file) => file.documentId),
				history: nextMessages.slice(-10).map((item) => ({ role: item.role, text: item.text })),
			});

			const assistantMessage: ChatMessage = {
				id: `${Date.now()}-assistant`,
				role: "assistant",
				text: response.answer,
			};

			setMessages((previous) => [...previous, assistantMessage]);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to get an answer right now.";

			setMessages((previous) => [
				...previous,
				{
					id: `${Date.now()}-assistant-error`,
					role: "assistant",
					text: message,
				},
			]);
		} finally {
			setIsSending(false);
		}
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
					onChange={(event) => void onAddFiles(event.target.files)}
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
									void onClearFiles();
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
												void onRemoveFile(item.id);
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
				<div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
					{messages.length === 0 ? (
						<p className="text-sm text-zinc-500">Upload a document to begin...</p>
					) : (
						messages.map((message) => (
							<div
								key={message.id}
								className={`rounded-md px-3 py-2 text-sm ${
									message.role === "user"
										? "ml-auto max-w-[60%] bg-docuery text-white"
										: "max-w-[90%] border border-docuery-light bg-zinc-50 text-zinc-800"
								}`}
							>
								{message.role === "assistant" ? (
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										components={{
											p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
											ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
											ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
											li: ({ children }) => <li className="mb-1">{children}</li>,
											table: ({ children }) => (
												<div className="my-2 overflow-x-auto rounded-md border border-docuery-light">
													<table className="min-w-full border-collapse text-left text-sm">{children}</table>
												</div>
											),
											th: ({ children }) => <th className="bg-zinc-100 px-2 py-1 font-semibold">{children}</th>,
											td: ({ children }) => <td className="border-t border-docuery-light px-2 py-1 align-top">{children}</td>,
											code: ({ children }) => (
												<code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.85em]">{children}</code>
											),
										}}
									>
										{cleanAssistantMarkdown(message.text)}
									</ReactMarkdown>
								) : (
									message.text
								)}
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
							disabled={!draft.trim() || isSending}
							className="rounded-md bg-docuery px-3 py-2 text-sm text-white transition hover:bg-docuery-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSending ? "..." : "➤"}
						</button>
					</div>
				</form>
			</div>
		</section>
	);
};

export default Chat;
