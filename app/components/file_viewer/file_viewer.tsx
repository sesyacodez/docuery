"use client";

import { useEffect, useRef } from "react";

import { UploadedPdf } from "../document_workspace/document_workspace";

type FileViewerProps = {
	files: UploadedPdf[];
	activeFileId: string | null;
	onSelectFile: (fileId: string) => void;
	resizeCompleteToken: number;
};

const FileViewer = ({ files, activeFileId, onSelectFile, resizeCompleteToken }: FileViewerProps) => {
	const activeFile = files.find((item) => item.id === activeFileId) ?? null;
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (!activeFileId) {
			return;
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(new Event("resize"));
		}

		const iframeWindow = iframeRef.current?.contentWindow;

		if (!iframeWindow) {
			return;
		}

		try {
			iframeWindow.dispatchEvent(new Event("resize"));
		} catch {}
	}, [activeFileId, resizeCompleteToken]);

	return (
		<section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-docuery-light bg-white">
			<header className="flex items-center gap-2 border-b border-docuery-light bg-zinc-50 px-3 py-2">
				<h2 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700">
					{activeFile ? activeFile.file.name : "PDF Viewer"}
				</h2>
				{files.length > 1 && (
					<select
						value={activeFileId ?? files[0].id}
						onChange={(event) => onSelectFile(event.target.value)}
						aria-label="Select document"
						className="max-w-56 rounded-md border border-docuery-light bg-white px-2 py-1 text-sm text-zinc-700 outline-none"
					>
						{files.map((file) => (
							<option key={file.id} value={file.id}>
								{file.file.name}
							</option>
						))}
					</select>
				)}
			</header>
			<div className="min-h-0 flex-1 p-3">
				{activeFile ? (
					<iframe
						ref={iframeRef}
						src={`${activeFile.objectUrl}#view=FitH`}
						title={activeFile.file.name}
						className="h-full w-full rounded-md border border-docuery-light"
					/>
				) : (
					<div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed border-docuery-light bg-zinc-50 px-4 text-center">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-2xl text-zinc-500">
							📄
						</div>
						<p className="text-base font-medium text-zinc-700">No document loaded</p>
						<p className="mt-1 text-sm text-zinc-500">Upload a PDF, then choose it from the viewer file list</p>
					</div>
				)}
			</div>
		</section>
	);
};

export default FileViewer;
