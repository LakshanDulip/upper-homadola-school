import { RoleDashboard } from "@/components/role-dashboard";
export default function AdminPage(){ return <RoleDashboard role="admin" heading="Admin Dashboard" allowedRoles={["admin","principal","superadmin","developer"]}/>; }
