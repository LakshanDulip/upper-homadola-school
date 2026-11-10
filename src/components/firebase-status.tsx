"use client";
import { useEffect, useState } from "react";
import { firebaseApp } from "@/lib/firebase/client";

export function FirebaseStatus() {
  const [status, setStatus] = useState("Checking Firebase setup…");
  useEffect(() => {
    // This checks Web SDK initialization, not database permissions or account login.
    setStatus(firebaseApp.options.projectId === "upper-homadola-school"
      ? "Firebase Web SDK configured — secure login is not enabled in this preview."
      : "Firebase configuration needs attention.");
  }, []);
  return <p role="status">{status}</p>;
}
