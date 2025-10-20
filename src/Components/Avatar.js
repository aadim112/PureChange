import React from "react";
import styles from "./Avatar.module.css";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

function Avatar({ initials = "N/A", size = "large", className = "" }) {
  const navigate = useNavigate();

  const sizeMap = {
    large: { size: 120, font: 48 },
    medium: { size: 90, font: 36 },
    small: { size: 60, font: 22 },
  };

  let selectedSize;
  if (typeof size === "string") {
    selectedSize = sizeMap[size] || sizeMap.large;
  } else if (typeof size === "number") {
    selectedSize = { size, font: size / 2.5 };
  } else if (typeof size === "object" && size.size) {
    selectedSize = {
      size: size.size,
      font: size.font || size.size / 2.5,
    };
  } else {
    selectedSize = sizeMap.large;
  }

  const avatarStyle = {
    width: `${selectedSize.size}px`,
    height: `${selectedSize.size}px`,
    fontSize: `${selectedSize.font}px`,
  };

  const avatarClassName = clsx(styles["avatar-circle"], className);

  return (
    <div
      className={avatarClassName}
      style={avatarStyle}
      onClick={() => navigate("/mypage")}
    >
      {initials}
    </div>
  );
}

export default Avatar;