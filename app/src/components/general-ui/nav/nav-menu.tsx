// src/components/general-ui/nav/NavMenu.tsx

const NavMenu = () => {
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <nav className="nav-menu">
      <div className="nav-left">
        <a
          href="/"
          className="app-logo"
          draggable="false"
          onClick={handleHomeClick}
          aria-label="Home"
        >
          <h2 className="nav-logo-text">EO</h2>
        </a>
      </div>

      <div className="nav-right">
        <a
          href="https://github.com/EfeOzalpp"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-text-link"
          draggable="false"
        >
          GitHub
        </a>

        <a
          href="https://www.linkedin.com/in/efe-ozalp/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-text-link"
          draggable="false"
        >
          LinkedIn
        </a>

        <a
          href="https://drive.google.com/file/d/1c7RPEnFZaaVNBSuYT3pxmyz0QkeA5hAn/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-text-link"
          draggable="false"
        >
          Resume
        </a>

        <a
          href="https://butterflyeff3ct.online/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-text-link"
          draggable="false"
        >
          Live App
        </a>
      </div>
    </nav>
  );
};

export default NavMenu;
