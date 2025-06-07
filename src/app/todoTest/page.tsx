import { createClient } from "@/utils/supabase/server";

export default async function TodoList() {
  const supabase = await createClient();
  const { data: todos } = await supabase.from("todos").select();

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}
      className="text-black"
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                textAlign: "left",
                backgroundColor: "#f2f2f2",
              }}
            >
              ID
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                textAlign: "left",
                backgroundColor: "#f2f2f2",
              }}
            >
              Task
            </th>
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                textAlign: "left",
                backgroundColor: "#f2f2f2",
              }}
            >
              Is Complete
            </th>
          </tr>
        </thead>
        <tbody>
          {todos?.map((row) => (
            <tr key={row.id}>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {row.id}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {row.task}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {String(row.completed_state)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
