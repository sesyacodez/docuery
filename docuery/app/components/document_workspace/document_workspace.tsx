"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { clearDocuments, deleteDocument, uploadDocument } from "@/app/lib/api";

import Chat from "../chat/chat";
import FileViewer from "../file_viewer/file_viewer";

export type UploadedPdf = {
	id: string;
	documentId: string;
	file: File;
	objectUrl: string;
};

const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
const SPLIT_RATIO_STORAGE_KEY = "docuery:workspace-split-ratio";
const MIN_SPLIT_RATIO = 30;
const MAX_SPLIT_RATIO = 70;

const DocumentWorkspace = () => {
	const [files, setFiles] = useState<UploadedPdf[]>([]);
	const [activeFileId, setActiveFileId] = useState<string | null>(null);
	const [resizeCompleteToken, setResizeCompleteToken] = useState(0);
	const [splitRatio, setSplitRatio] = useState(() => {
		if (typeof window === "undefined") {
			return 50;
		}

		const storedValue = window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
		const parsed = Number(storedValue);

		if (!Number.isFinite(parsed)) {
			return 50;
		}

		return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, parsed));
	});
	const [isResizing, setIsResizing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const filesRef = useRef<UploadedPdf[]>([]);

	useEffect(() => {
		filesRef.current = files;
	}, [files]);

	useEffect(() => {
		return () => {
			for (const item of filesRef.current) {
				URL.revokeObjectURL(item.objectUrl);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(splitRatio));
	}, [splitRatio]);

	useEffect(() => {
		if (!isResizing) return;

		const handlePointerMove = (event: PointerEvent) => {
			const containerRect = containerRef.current?.getBoundingClientRect();

			if (!containerRect || containerRect.width === 0) return;

			const ratio = ((event.clientX - containerRect.left) / containerRect.width) * 100;
			const clampedRatio = Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));

			setSplitRatio(clampedRatio);
		};

		const stopResize = () => {
			setResizeCompleteToken((previous) => previous + 1);
			setIsResizing(false);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", stopResize);
		window.addEventListener("pointercancel", stopResize);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", stopResize);
			window.removeEventListener("pointercancel", stopResize);
		};
	}, [isResizing]);

	const addPdfFiles = async (incomingFiles: FileList | null) => {
		if (!incomingFiles) return;

		const pdfFiles = Array.from(incomingFiles).filter(
			(file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
		);

		if (!pdfFiles.length) return;

		const existingIds = new Set(files.map((item) => item.id));

		for (const file of pdfFiles) {
			const fileId = getFileKey(file);

			if (existingIds.has(fileId)) {
				continue;
			}

			const uploaded = await uploadDocument(file);

			setFiles((previous) => {
				if (previous.some((item) => item.id === fileId)) {
					return previous;
				}

				return [
					...previous,
					{
						id: fileId,
						documentId: uploaded.document_id,
						file,
						objectUrl: URL.createObjectURL(file),
					},
				];
			});
		}
	};

	const removeFile = async (fileId: string) => {
		const fileToDelete = files.find((item) => item.id === fileId) ?? null;
		setFiles((previous) => {
			const removedFile = previous.find((item) => item.id === fileId);

			if (removedFile) {
				URL.revokeObjectURL(removedFile.objectUrl);
			}

			return previous.filter((item) => item.id !== fileId);
		});

		setActiveFileId((previous) => (previous === fileId ? null : previous));

		if (fileToDelete) {
			try {
				await deleteDocument(fileToDelete.documentId);
			} catch {}
		}
	};

	const clearFiles = async () => {
		setFiles((previous) => {
			for (const item of previous) {
				URL.revokeObjectURL(item.objectUrl);
			}

			return [];
		});
		setActiveFileId(null);

		try {
			await clearDocuments();
		} catch {}
	};

	const resolvedActiveFileId = useMemo(() => {
		if (!files.length) {
			return null;
		}

		if (activeFileId && files.some((item) => item.id === activeFileId)) {
			return activeFileId;
		}

		return files[0].id;
	}, [files, activeFileId]);

	const leftPaneStyle = {
		flexBasis: `${splitRatio}%`,
	};

	const rightPaneStyle = {
		flexBasis: `${100 - splitRatio}%`,
	};

	return (
		<div
			ref={containerRef}
			className="grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 lg:flex lg:gap-0"
		>
			<div suppressHydrationWarning className="min-h-0 w-full lg:flex-none" style={leftPaneStyle}>
				<Chat
					files={files}
					activeFileId={resolvedActiveFileId}
					onAddFiles={addPdfFiles}
					onRemoveFile={removeFile}
					onClearFiles={clearFiles}
					onSelectFile={setActiveFileId}
				/>
			</div>
			<div
				role="separator"
				aria-orientation="vertical"
				className="hidden cursor-col-resize select-none items-center justify-center px-1 lg:flex"
				onPointerDown={() => setIsResizing(true)}
			>
				<div className="h-16 w-1 rounded-full bg-docuery-light" />
			</div>
			<div suppressHydrationWarning className="min-h-0 w-full lg:flex-none" style={rightPaneStyle}>
				<FileViewer
					files={files}
					activeFileId={resolvedActiveFileId}
					onSelectFile={setActiveFileId}
					resizeCompleteToken={resizeCompleteToken}
				/>
			</div>
		</div>
	);
};

export default DocumentWorkspace;
