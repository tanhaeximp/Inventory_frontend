// Example: Daily Sales Summary
import { useEffect, useState } from "react";
import axios from "axios";

export default function DailySalesReport() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const fetchSales = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/sales", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(res.data);
    };
    fetchSales();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todaySales = sales.filter(s => s.saleDate.startsWith(today));

  const totalSales = todaySales.reduce((acc, s) => acc + s.quantity * s.sellingPrice, 0);

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold">Today's Sales</h2>
      <p>Total Sales: {totalSales}</p>
      <ul>
        {todaySales.map(s => (
          <li key={s._id}>{s.product} - {s.quantity} units - {s.sellingPrice} each</li>
        ))}
      </ul>
    </div>
  );
}
