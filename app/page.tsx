import Chat from "./components/chat/chat";

export default function Home() {
  return (
    <div className="h-[100dvh] min-h-[100svh] overflow-hidden bg-zinc-50 px-4 pt-24 font-sans">
      <main className="mx-auto flex h-full min-h-0 w-full max-w-5xl items-stretch justify-center">
        <Chat />
      </main>
    </div>
  );
}
