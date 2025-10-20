import React, { useState } from "react";
import styles from "./Navbar.module.css";
import Button from "./Button";
import { ReactComponent as Menu } from "../assets/Menu.svg";
import { useNavigate } from "react-router-dom";
import { ReactComponent as Flame } from "../assets/Flame.svg"

const defaultButtons = [
  { label: "Home", variant: "primary", route: "/" },
  { label: "About", variant: "secondary", route: "/about" },
];


function Navbar({ 
  pageName = "Home",
  Icon = Flame,
  buttons = defaultButtons
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles["navbar"]}>
      <div className={styles["logo-section"]}>
        {Icon && <Icon style={{ width: 20, height: 20 }} />}
        <p className={styles["page-name"]}>{pageName}</p>
      </div>

      {/* Hamburger button visible on small screens */}
      <div
        className={styles["menu-icon"]}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <Menu style={{ width: 20, height: 20 }} />
      </div>

      {/* Navigation buttons (conditionally visible) */}
      <div
        className={`${styles["navigation-buttons"]} ${
          menuOpen ? styles["active"] : ""
        }`}
      >
        {buttons?.map((btn, index) => (
          <Button
            key={index}
            variant={btn.variant}
            onClick={() => navigate(btn.route)}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default Navbar;