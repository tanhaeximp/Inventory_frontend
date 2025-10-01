// src/pages/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "./api";
import ResponsiveTableCards from "../components/ResponsiveTableCards";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}
function Button({ children, onClick, type = "button", variant = "primary", disabled }) {
  const base = "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const styles = { primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", soft: "bg-gray-100 hover:bg-gray-200 text-gray-800", danger: "bg-rose-600 hover:bg-rose-700 text-white" };
  return <button type={type} className={`${base} ${styles[variant] || styles.primary}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchUsers = async () => {
    setLoading(true); setErr("");
    try { const res = await api.get("/api/users"); setUsers(res.data || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load users"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      String(u.name || "").toLowerCase().includes(term) ||
      String(u.email || "").toLowerCase().includes(term) ||
      String(u.role || "").toLowerCase().includes(term)
    );
  }, [q, users]);

  const invite = () => alert("Implement invite flow");
  const edit = (u) => alert(`Edit ${u.name}`);
  const remove = async (u) => {
    if (!window.confirm(`${t("delete") || "Delete"} "${u.name}"?`)) return;
    try { await api.delete(`/api/users/${u._id}`); fetchUsers(); }
    catch (e) { alert(e?.response?.data?.message || "Failed to delete"); }
  };

  const columns = [
    { header: t("name") || "Name" },
    { header: t("email") || "Email" },
    { header: t("role") || "Role" },
    { header: "" },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{t("users") || "Users"}</div>
              <h1 className="text-3xl font-bold tracking-tight">{t("teamMembers") || "Team Members"}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" onClick={fetchUsers} disabled={loading}>{loading ? (t("loading") || "Loading...") : (t("refresh") || "Refresh")}</Button>
              <Button onClick={invite}>+ {t("invite") || "Invite"}</Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder={t("searchUsers") || "Search users..."}
          value={q} onChange={(e) => setQ(e.target.value)}
        />

        <ResponsiveTableCards
          items={filtered}
          columns={columns}
          minTableWidth={700}
          renderRow={(u, idx) => (
            <tr key={u._id || idx}>
              <td className="px-3 py-2">{u.name}</td>
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.role}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <Button variant="soft" onClick={() => edit(u)}>{t("edit") || "Edit"}</Button>
                  <Button variant="danger" onClick={() => remove(u)}>{t("delete") || "Delete"}</Button>
                </div>
              </td>
            </tr>
          )}
          renderCard={(u, idx) => (
            <div key={u._id || idx} className="rounded-xl border p-3 bg-white space-y-1">
              <div className="font-medium">{u.name}</div>
              <div className="text-sm text-gray-600">{u.email}</div>
              <div className="text-sm text-gray-600">{u.role}</div>
              <div className="pt-2 flex gap-2">
                <Button variant="soft" onClick={() => edit(u)}>{t("edit") || "Edit"}</Button>
                <Button variant="danger" onClick={() => remove(u)}>{t("delete") || "Delete"}</Button>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
