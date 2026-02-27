const Header = () => {
    return (
        <nav className="w-full fixed top-0 left-0 py-4 px-4 border-b border-docuery-light z-10 bg-white flex items-center justify-center">
            <img src="/logo.png" alt="Docuery Logo" className="w-12 mr-2 aspect-square object-contain" />
            <h2 className="m-0 text-lg text-docuery font-mono font-semibold leading-tight">Docuery - ask your documents anything</h2>
        </nav>
    )
}
export default Header;