"use client";

import Link from "next/link";
import { AuthGate } from "@/components/auth-gate";
import { roleLabel, type SchoolRole } from "@/lib/auth/roles";

const modules: Record<SchoolRole, string[]> = {
  student: ["My Profile", "Homework", "Published Exam Results", "Exam Timetable", "Question Bank", "Activities & Achievements", "My Library Loans"],
  teacher: ["My Assigned Subjects", "Enter Exam Marks", "Homework", "My Timetable", "My Responsible Grade (when assigned)", "Question Bank"],
  admin: ["Student Management", "Teacher Management", "Grades & Academics", "Exam Timetables", "Notices", "School Analytics", "Website & Theme Editor", "Library (separate module)"],
  principal: ["School Analytics", "Exam Approval", "Confidential Concerns", "School Notices", "Academic Oversight"],
  superadmin: ["Account & Role Administration", "Theme Manager", "School Branding", "System Settings", "Audit Logs"],
  developer: ["Developer Operations", "System Configuration", "Audit Logs", "Security Monitoring", "School Branding"],
};

export function RoleDashboard({ role, heading, allowedRoles }: { role: SchoolRole; heading: string; allowedRoles?: SchoolRole[] }) {
  return <AuthGate allowedRoles={allowedRoles ?? [role]}>
    <header className="top"><strong>G/Upper Homadola School</strong><nav className="navlist"><Link href="/">Home</Link><Link href="/login/">Account</Link></nav></header>
    <main className="section">
      <span className="tag">{roleLabel[role].toUpperCase()} · VERIFIED ACCESS</span>
      <h1>{heading}</h1>
      <div className="notice"><strong>Module scaffolding only:</strong> Your school role and active account are checked. Private records, account creation and management actions are not enabled yet.</div>
      <div className="cards" style={{marginTop:24}}>
        {modules[role].map((name)=><article key={name} className="card"><h3>{name}</h3><p>Planned — will require server/database permission checks.</p></article>)}
      </div>
      {role === "admin" && <p className="role-note">Library books and loans are not shown on Admin Overview; open the Library module when it is implemented.</p>}
    </main>
    <footer className="footer"><span>G/Upper Homadola School</span><span>Developed by Lakshan</span></footer>
  </AuthGate>;
}
