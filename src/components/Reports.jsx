import { useState, useEffect } from "react";
import axios from "axios";

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const token = localStorage.getItem("token");

  const fetchReport = async () => {
    const res = await axios.get("http://localhost:5000/api/reports/daily", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setReport(res.data);
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Daily Report</h2>
      {report ? (
        <div className="p-4 border rounded">
          <p>Date: {new Date(report.date).toDateString()}</p>
          <p>Total Purchases: ${report.totalPurchase}</p>
          <p>Total Sales: ${report.totalSale}</p>
        </div>
      ) : (
        <p>Loading report...</p>
      )}
    </div>
  );
}
