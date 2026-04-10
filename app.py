# import os
# import math
# import sqlite3
# from datetime import datetime, timedelta, timezone
# from uuid import uuid4
# from flask import Flask, jsonify, render_template, request, send_from_directory
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)
# app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
# app.config["DATABASE_URL"] = os.getenv("DATABASE_URL", "incidents.db")
# UPLOAD_DIR = "uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)


# def get_db():
#     conn = sqlite3.connect(app.config["DATABASE_URL"])
#     conn.row_factory = sqlite3.Row
#     return conn


# def ensure_columns(conn):
#     existing = {row["name"] for row in conn.execute("PRAGMA table_info(incidents)").fetchall()}
#     additions = {
#         "blockage_range_m": "REAL",
#         "authority_assigned": "INTEGER NOT NULL DEFAULT 0",
#         "authority_name": "TEXT",
#         "estimated_resolution_minutes": "INTEGER",
#         "casualties": "INTEGER NOT NULL DEFAULT 0",
#     }
#     for col, col_type in additions.items():
#         if col not in existing:
#             conn.execute(f"ALTER TABLE incidents ADD COLUMN {col} {col_type}")


# def init_db():
#     with get_db() as conn:
#         conn.execute(
#             """
#             CREATE TABLE IF NOT EXISTS incidents (
#                 id INTEGER PRIMARY KEY AUTOINCREMENT,
#                 latitude REAL NOT NULL,
#                 longitude REAL NOT NULL,
#                 type TEXT NOT NULL,
#                 severity TEXT NOT NULL,
#                 description TEXT NOT NULL,
#                 photo_url TEXT,
#                 timestamp TEXT NOT NULL,
#                 status TEXT NOT NULL DEFAULT 'Active',
#                 votes INTEGER NOT NULL DEFAULT 0,
#                 verified INTEGER NOT NULL DEFAULT 0,
#                 resolved_at TEXT,
#                 alerted INTEGER NOT NULL DEFAULT 0,
#                 blockage_range_m REAL,
#                 authority_assigned INTEGER NOT NULL DEFAULT 0,
#                 authority_name TEXT,
#                 estimated_resolution_minutes INTEGER,
#                 casualties INTEGER NOT NULL DEFAULT 0
#             )
#             """
#         )
#         ensure_columns(conn)


# def haversine_meters(lat1, lon1, lat2, lon2):
#     r = 6371000
#     p1 = math.radians(lat1)
#     p2 = math.radians(lat2)
#     dp = math.radians(lat2 - lat1)
#     dl = math.radians(lon2 - lon1)
#     a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
#     return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# def severity_order(value):
#     return {"Critical": 3, "Medium": 2, "Low": 1}.get(value, 0)


# def maybe_verify_incident(conn, lat, lon, ts):
#     window_start = (ts - timedelta(minutes=30)).isoformat()
#     rows = conn.execute(
#         "SELECT id, latitude, longitude FROM incidents WHERE timestamp >= ?",
#         (window_start,),
#     ).fetchall()
#     matches = [r for r in rows if haversine_meters(lat, lon, r["latitude"], r["longitude"]) <= 200]
#     if len(matches) >= 3:
#         ids = [m["id"] for m in matches]
#         q = ",".join("?" * len(ids))
#         conn.execute(f"UPDATE incidents SET verified = 1 WHERE id IN ({q})", ids)


# def maybe_escalate(conn):
#     now = datetime.now(timezone.utc)
#     threshold = (now - timedelta(hours=2)).isoformat()
#     rows = conn.execute(
#         """
#         SELECT id FROM incidents
#         WHERE severity = 'Critical'
#           AND status != 'Resolved'
#           AND timestamp <= ?
#           AND alerted = 0
#         """,
#         (threshold,),
#     ).fetchall()
#     for row in rows:
#         print(f"[NOTIFICATION] Critical incident #{row['id']} unresolved for more than 2 hours")
#         conn.execute("UPDATE incidents SET alerted = 1 WHERE id = ?", (row["id"],))


# def row_to_dict(row):
#     d = dict(row)
#     d["severity_rank"] = severity_order(d["severity"])
#     default_eta = {
#         "Critical": 30,
#         "Medium": 60,
#         "Low": 120,
#     }.get(d["severity"], 90)
#     eta = d.get("estimated_resolution_minutes") or default_eta
#     d["estimated_response_time"] = f"{eta} mins"
#     return d


# def filters_clause(args):
#     clauses = []
#     values = []
#     if args.get("severity"):
#         clauses.append("severity = ?")
#         values.append(args["severity"])
#     if args.get("status"):
#         clauses.append("status = ?")
#         values.append(args["status"])
#     if args.get("type"):
#         clauses.append("type = ?")
#         values.append(args["type"])
#     if args.get("verified") in {"0", "1"}:
#         clauses.append("verified = ?")
#         values.append(int(args["verified"]))
#     if args.get("min_votes"):
#         clauses.append("votes >= ?")
#         values.append(int(args["min_votes"]))
#     if args.get("date_from"):
#         clauses.append("timestamp >= ?")
#         values.append(args["date_from"])
#     if args.get("date_to"):
#         clauses.append("timestamp <= ?")
#         values.append(args["date_to"])
#     where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
#     return where, values


# @app.route("/")
# def index():
#     return render_template("index.html")


# @app.route("/uploads/<path:filename>")
# def uploads(filename):
#     return send_from_directory(UPLOAD_DIR, filename)


# @app.route("/api/report", methods=["POST"])
# def report():
#     form = request.form
#     lat = float(form.get("latitude", 0))
#     lon = float(form.get("longitude", 0))
#     incident_type = form.get("type", "")
#     severity = form.get("severity", "Low")
#     description = form.get("description", "").strip()
#     blockage_range = form.get("blockage_range_m")
#     authority_assigned = 1 if form.get("authority_assigned") == "true" else 0
#     authority_name = form.get("authority_name", "").strip() or None
#     estimated_resolution_minutes = form.get("estimated_resolution_minutes")
#     casualties = int(form.get("casualties", 0) or 0)

#     if not incident_type or not description:
#         return jsonify({"error": "Missing required fields"}), 400

#     blockage_range_value = float(blockage_range) if blockage_range else None
#     estimated_resolution_value = int(estimated_resolution_minutes) if estimated_resolution_minutes else None
#     if incident_type == "Road Block" and blockage_range_value is not None and blockage_range_value >= 10:
#         severity = "Critical"

#     photo_url = None
#     file = request.files.get("photo")
#     if file and file.filename:
#         ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
#         filename = f"{uuid4().hex}{ext}"
#         path = os.path.join(UPLOAD_DIR, filename)
#         file.save(path)
#         photo_url = f"/uploads/{filename}"

#     now = datetime.now(timezone.utc)
#     with get_db() as conn:
#         cur = conn.execute(
#             """
#             INSERT INTO incidents (
#                 latitude, longitude, type, severity, description, photo_url, timestamp, status, votes,
#                 blockage_range_m, authority_assigned, authority_name, estimated_resolution_minutes, casualties
#             )
#             VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 0, ?, ?, ?, ?, ?)
#             """,
#             (
#                 lat,
#                 lon,
#                 incident_type,
#                 severity,
#                 description,
#                 photo_url,
#                 now.isoformat(),
#                 blockage_range_value,
#                 authority_assigned,
#                 authority_name,
#                 estimated_resolution_value,
#                 casualties,
#             ),
#         )
#         incident_id = cur.lastrowid
#         maybe_verify_incident(conn, lat, lon, now)
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     return jsonify(row_to_dict(row)), 201


# @app.route("/api/incidents", methods=["GET"])
# def get_incidents():
#     where, values = filters_clause(request.args)
#     with get_db() as conn:
#         maybe_escalate(conn)
#         rows = conn.execute(f"SELECT * FROM incidents {where}", values).fetchall()
#     incidents = [row_to_dict(r) for r in rows]
#     incidents.sort(key=lambda x: (x["severity_rank"], x["timestamp"]), reverse=True)
#     return jsonify(incidents)


# @app.route("/api/map", methods=["GET"])
# def map_data():
#     with get_db() as conn:
#         rows = conn.execute("SELECT * FROM incidents").fetchall()
#     return jsonify([row_to_dict(r) for r in rows])


# @app.route("/api/history", methods=["GET"])
# def history():
#     with get_db() as conn:
#         rows = conn.execute(
#             "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100"
#         ).fetchall()
#     return jsonify([row_to_dict(r) for r in rows])


# @app.route("/api/incidents/<int:incident_id>/resolve", methods=["PATCH"])
# def resolve_incident(incident_id):
#     with get_db() as conn:
#         conn.execute(
#             "UPDATE incidents SET status = 'Resolved', resolved_at = ? WHERE id = ?",
#             (datetime.now(timezone.utc).isoformat(), incident_id),
#         )
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/incidents/<int:incident_id>/under-response", methods=["PATCH"])
# def under_response_incident(incident_id):
#     with get_db() as conn:
#         conn.execute("UPDATE incidents SET status = 'Under Response' WHERE id = ?", (incident_id,))
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/vote", methods=["POST"])
# def vote():
#     data = request.get_json(silent=True) or {}
#     incident_id = data.get("id")
#     delta = int(data.get("delta", 0))
#     if delta not in (-1, 1):
#         return jsonify({"error": "Invalid vote"}), 400
#     with get_db() as conn:
#         conn.execute("UPDATE incidents SET votes = votes + ? WHERE id = ?", (delta, incident_id))
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/dashboard", methods=["GET"])
# def dashboard():
#     with get_db() as conn:
#         rows = conn.execute("SELECT * FROM incidents").fetchall()
#     rows_dict = [dict(r) for r in rows]
#     total = len(rows_dict)
#     critical = sum(1 for i in rows_dict if i["severity"] == "Critical")
#     response_times = []
#     for i in rows_dict:
#         if i["resolved_at"]:
#             start = datetime.fromisoformat(i["timestamp"])
#             end = datetime.fromisoformat(i["resolved_at"])
#             response_times.append((end - start).total_seconds() / 60)
#     avg = round(sum(response_times) / len(response_times), 1) if response_times else 0
#     rows_dict.sort(key=lambda x: (severity_order(x["severity"]), x["timestamp"]), reverse=True)
#     return jsonify(
#         {
#             "total": total,
#             "critical": critical,
#             "average_response_time": avg,
#             "incidents": [
#                 {
#                     **i,
#                     "severity_rank": severity_order(i["severity"]),
#                     "estimated_response_time": f"{i['estimated_resolution_minutes'] or ({'Critical': 30, 'Medium': 60, 'Low': 120}.get(i['severity'], 90))} mins",
#                 }
#                 for i in rows_dict
#             ],
#         }
#     )


# if __name__ == "__main__":
#     init_db()
#     app.run(host="0.0.0.0", port=5001, debug=True)
# else:
#     init_db()

# import os
# import math
# import sqlite3
# from datetime import datetime, timedelta, timezone
# from uuid import uuid4
# from flask import Flask, jsonify, render_template, request, send_from_directory
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)
# app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
# app.config["DATABASE_URL"] = os.getenv("DATABASE_URL", "incidents.db")
# UPLOAD_DIR = "uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)


# def get_db():
#     conn = sqlite3.connect(app.config["DATABASE_URL"])
#     conn.row_factory = sqlite3.Row
#     return conn


# def ensure_columns(conn):
#     existing = {row["name"] for row in conn.execute("PRAGMA table_info(incidents)").fetchall()}
#     additions = {
#         "blockage_range_m": "REAL",
#         "authority_assigned": "INTEGER NOT NULL DEFAULT 0",
#         "authority_name": "TEXT",
#         "estimated_resolution_minutes": "INTEGER",
#         "casualties": "INTEGER NOT NULL DEFAULT 0",
#     }
#     for col, col_type in additions.items():
#         if col not in existing:
#             conn.execute(f"ALTER TABLE incidents ADD COLUMN {col} {col_type}")


# def init_db():
#     with get_db() as conn:
#         conn.execute(
#             """
#             CREATE TABLE IF NOT EXISTS incidents (
#                 id INTEGER PRIMARY KEY AUTOINCREMENT,
#                 latitude REAL NOT NULL,
#                 longitude REAL NOT NULL,
#                 type TEXT NOT NULL,
#                 severity TEXT NOT NULL,
#                 description TEXT NOT NULL,
#                 photo_url TEXT,
#                 timestamp TEXT NOT NULL,
#                 status TEXT NOT NULL DEFAULT 'Active',
#                 votes INTEGER NOT NULL DEFAULT 0,
#                 verified INTEGER NOT NULL DEFAULT 0,
#                 resolved_at TEXT,
#                 alerted INTEGER NOT NULL DEFAULT 0,
#                 blockage_range_m REAL,
#                 authority_assigned INTEGER NOT NULL DEFAULT 0,
#                 authority_name TEXT,
#                 estimated_resolution_minutes INTEGER,
#                 casualties INTEGER NOT NULL DEFAULT 0
#             )
#             """
#         )
#         ensure_columns(conn)


# def haversine_meters(lat1, lon1, lat2, lon2):
#     r = 6371000
#     p1 = math.radians(lat1)
#     p2 = math.radians(lat2)
#     dp = math.radians(lat2 - lat1)
#     dl = math.radians(lon2 - lon1)
#     a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
#     return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# def severity_order(value):
#     return {"Critical": 3, "Medium": 2, "Low": 1}.get(value, 0)


# def maybe_verify_incident(conn, lat, lon, ts):
#     window_start = (ts - timedelta(minutes=30)).isoformat()
#     rows = conn.execute(
#         "SELECT id, latitude, longitude FROM incidents WHERE timestamp >= ?",
#         (window_start,),
#     ).fetchall()
#     matches = [r for r in rows if haversine_meters(lat, lon, r["latitude"], r["longitude"]) <= 200]
#     if len(matches) >= 3:
#         ids = [m["id"] for m in matches]
#         q = ",".join("?" * len(ids))
#         conn.execute(f"UPDATE incidents SET verified = 1 WHERE id IN ({q})", ids)


# def maybe_escalate(conn):
#     now = datetime.now(timezone.utc)
#     threshold = (now - timedelta(hours=2)).isoformat()
#     rows = conn.execute(
#         """
#         SELECT id FROM incidents
#         WHERE severity = 'Critical'
#           AND status != 'Resolved'
#           AND timestamp <= ?
#           AND alerted = 0
#         """,
#         (threshold,),
#     ).fetchall()
#     for row in rows:
#         print(f"[NOTIFICATION] Critical incident #{row['id']} unresolved for more than 2 hours")
#         conn.execute("UPDATE incidents SET alerted = 1 WHERE id = ?", (row["id"],))


# def row_to_dict(row):
#     d = dict(row)
#     d["severity_rank"] = severity_order(d["severity"])
#     default_eta = {
#         "Critical": 30,
#         "Medium": 60,
#         "Low": 120,
#     }.get(d["severity"], 90)
#     eta = d.get("estimated_resolution_minutes") or default_eta
#     d["estimated_response_time"] = f"{eta} mins"
#     return d


# def filters_clause(args):
#     clauses = []
#     values = []
#     if args.get("severity"):
#         clauses.append("severity = ?")
#         values.append(args["severity"])
#     if args.get("status"):
#         clauses.append("status = ?")
#         values.append(args["status"])
#     if args.get("type"):
#         clauses.append("type = ?")
#         values.append(args["type"])
#     if args.get("verified") in {"0", "1"}:
#         clauses.append("verified = ?")
#         values.append(int(args["verified"]))
#     if args.get("min_votes"):
#         clauses.append("votes >= ?")
#         values.append(int(args["min_votes"]))
#     if args.get("date_from"):
#         clauses.append("timestamp >= ?")
#         values.append(args["date_from"])
#     if args.get("date_to"):
#         clauses.append("timestamp <= ?")
#         values.append(args["date_to"])
#     where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
#     return where, values


# @app.route("/")
# def index():
#     return render_template("index.html")


# @app.route("/uploads/<path:filename>")
# def uploads(filename):
#     return send_from_directory(UPLOAD_DIR, filename)


# @app.route("/api/report", methods=["POST"])
# def report():
#     form = request.form
#     lat = float(form.get("latitude", 0))
#     lon = float(form.get("longitude", 0))
#     incident_type = form.get("type", "")
#     severity = form.get("severity", "Low")
#     description = form.get("description", "").strip()
#     blockage_range = form.get("blockage_range_m")
#     authority_assigned = 1 if form.get("authority_assigned") == "true" else 0
#     authority_name = form.get("authority_name", "").strip() or None
#     estimated_resolution_minutes = form.get("estimated_resolution_minutes")
#     casualties = int(form.get("casualties", 0) or 0)

#     if not incident_type or not description:
#         return jsonify({"error": "Missing required fields"}), 400

#     blockage_range_value = float(blockage_range) if blockage_range else None
#     estimated_resolution_value = int(estimated_resolution_minutes) if estimated_resolution_minutes else None
#     if incident_type == "Road Block" and blockage_range_value is not None and blockage_range_value >= 10:
#         severity = "Critical"

#     photo_url = None
#     file = request.files.get("photo")
#     if file and file.filename:
#         ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
#         filename = f"{uuid4().hex}{ext}"
#         path = os.path.join(UPLOAD_DIR, filename)
#         file.save(path)
#         photo_url = f"/uploads/{filename}"

#     now = datetime.now(timezone.utc)
#     with get_db() as conn:
#         cur = conn.execute(
#             """
#             INSERT INTO incidents (
#                 latitude, longitude, type, severity, description, photo_url, timestamp, status, votes,
#                 blockage_range_m, authority_assigned, authority_name, estimated_resolution_minutes, casualties
#             )
#             VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 0, ?, ?, ?, ?, ?)
#             """,
#             (
#                 lat,
#                 lon,
#                 incident_type,
#                 severity,
#                 description,
#                 photo_url,
#                 now.isoformat(),
#                 blockage_range_value,
#                 authority_assigned,
#                 authority_name,
#                 estimated_resolution_value,
#                 casualties,
#             ),
#         )
#         incident_id = cur.lastrowid
#         maybe_verify_incident(conn, lat, lon, now)
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     return jsonify(row_to_dict(row)), 201


# @app.route("/api/incidents", methods=["GET"])
# def get_incidents():
#     where, values = filters_clause(request.args)
#     with get_db() as conn:
#         maybe_escalate(conn)
#         rows = conn.execute(f"SELECT * FROM incidents {where}", values).fetchall()
#     incidents = [row_to_dict(r) for r in rows]
#     incidents.sort(key=lambda x: (x["severity_rank"], x["timestamp"]), reverse=True)
#     return jsonify(incidents)


# @app.route("/api/map", methods=["GET"])
# def map_data():
#     with get_db() as conn:
#         rows = conn.execute("SELECT * FROM incidents").fetchall()
#     return jsonify([row_to_dict(r) for r in rows])


# @app.route("/api/history", methods=["GET"])
# def history():
#     with get_db() as conn:
#         rows = conn.execute(
#             "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100"
#         ).fetchall()
#     return jsonify([row_to_dict(r) for r in rows])


# @app.route("/api/incidents/<int:incident_id>/resolve", methods=["PATCH"])
# def resolve_incident(incident_id):
#     with get_db() as conn:
#         conn.execute(
#             "UPDATE incidents SET status = 'Resolved', resolved_at = ? WHERE id = ?",
#             (datetime.now(timezone.utc).isoformat(), incident_id),
#         )
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/incidents/<int:incident_id>/under-response", methods=["PATCH"])
# def under_response_incident(incident_id):
#     with get_db() as conn:
#         conn.execute("UPDATE incidents SET status = 'Under Response' WHERE id = ?", (incident_id,))
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/vote", methods=["POST"])
# def vote():
#     data = request.get_json(silent=True) or {}
#     incident_id = data.get("id")
#     delta = int(data.get("delta", 0))
#     if delta not in (-1, 1):
#         return jsonify({"error": "Invalid vote"}), 400
#     with get_db() as conn:
#         conn.execute("UPDATE incidents SET votes = votes + ? WHERE id = ?", (delta, incident_id))
#         row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
#     if not row:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(row_to_dict(row))


# @app.route("/api/dashboard", methods=["GET"])
# def dashboard():
#     with get_db() as conn:
#         rows = conn.execute("SELECT * FROM incidents").fetchall()
#     rows_dict = [dict(r) for r in rows]
#     total = len(rows_dict)
#     critical = sum(1 for i in rows_dict if i["severity"] == "Critical")
#     response_times = []
#     for i in rows_dict:
#         if i["resolved_at"]:
#             start = datetime.fromisoformat(i["timestamp"])
#             end = datetime.fromisoformat(i["resolved_at"])
#             response_times.append((end - start).total_seconds() / 60)
#     avg = round(sum(response_times) / len(response_times), 1) if response_times else 0
#     rows_dict.sort(key=lambda x: (severity_order(x["severity"]), x["timestamp"]), reverse=True)
#     return jsonify(
#         {
#             "total": total,
#             "critical": critical,
#             "average_response_time": avg,
#             "incidents": [
#                 {
#                     **i,
#                     "severity_rank": severity_order(i["severity"]),
#                     "estimated_response_time": f"{i['estimated_resolution_minutes'] or ({'Critical': 30, 'Medium': 60, 'Low': 120}.get(i['severity'], 90))} mins",
#                 }
#                 for i in rows_dict
#             ],
#         }
#     )


# if __name__ == "__main__":
#     init_db()
#     app.run(host="0.0.0.0", port=5004, debug=True)
# else:
#     init_db()

import os
import math
import sqlite3
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from flask import Flask, jsonify, render_template, request, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
app.config["DATABASE_URL"] = os.getenv("DATABASE_URL", "incidents.db")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db():
    conn = sqlite3.connect(app.config["DATABASE_URL"])
    conn.row_factory = sqlite3.Row
    return conn


def ensure_columns(conn):
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(incidents)").fetchall()}
    additions = {
        "blockage_range_m": "REAL",
        "authority_assigned": "INTEGER NOT NULL DEFAULT 0",
        "authority_name": "TEXT",
        "estimated_resolution_minutes": "INTEGER",
        "casualties": "INTEGER NOT NULL DEFAULT 0",
    }
    for col, col_type in additions.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE incidents ADD COLUMN {col} {col_type}")


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                photo_url TEXT,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                votes INTEGER NOT NULL DEFAULT 0,
                verified INTEGER NOT NULL DEFAULT 0,
                resolved_at TEXT,
                alerted INTEGER NOT NULL DEFAULT 0,
                blockage_range_m REAL,
                authority_assigned INTEGER NOT NULL DEFAULT 0,
                authority_name TEXT,
                estimated_resolution_minutes INTEGER,
                casualties INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        ensure_columns(conn)


def haversine_meters(lat1, lon1, lat2, lon2):
    r = 6371000
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def severity_order(value):
    return {"Critical": 3, "Medium": 2, "Low": 1}.get(value, 0)


def maybe_verify_incident(conn, lat, lon, ts):
    window_start = (ts - timedelta(minutes=30)).isoformat()
    rows = conn.execute(
        "SELECT id, latitude, longitude FROM incidents WHERE timestamp >= ?",
        (window_start,),
    ).fetchall()
    matches = [r for r in rows if haversine_meters(lat, lon, r["latitude"], r["longitude"]) <= 200]
    if len(matches) >= 3:
        ids = [m["id"] for m in matches]
        q = ",".join("?" * len(ids))
        conn.execute(f"UPDATE incidents SET verified = 1 WHERE id IN ({q})", ids)


def maybe_escalate(conn):
    now = datetime.now(timezone.utc)
    threshold = (now - timedelta(hours=2)).isoformat()
    rows = conn.execute(
        """
        SELECT id FROM incidents
        WHERE severity = 'Critical'
          AND status != 'Resolved'
          AND timestamp <= ?
          AND alerted = 0
        """,
        (threshold,),
    ).fetchall()
    for row in rows:
        print(f"[NOTIFICATION] Critical incident #{row['id']} unresolved for more than 2 hours")
        conn.execute("UPDATE incidents SET alerted = 1 WHERE id = ?", (row["id"],))


def row_to_dict(row):
    d = dict(row)
    d["severity_rank"] = severity_order(d["severity"])
    default_eta = {
        "Critical": 30,
        "Medium": 60,
        "Low": 120,
    }.get(d["severity"], 90)
    eta = d.get("estimated_resolution_minutes") or default_eta
    d["estimated_response_time"] = f"{eta} mins"
    return d


def filters_clause(args):
    clauses = []
    values = []
    if args.get("severity"):
        clauses.append("severity = ?")
        values.append(args["severity"])
    if args.get("status"):
        clauses.append("status = ?")
        values.append(args["status"])
    if args.get("type"):
        clauses.append("type = ?")
        values.append(args["type"])
    if args.get("verified") in {"0", "1"}:
        clauses.append("verified = ?")
        values.append(int(args["verified"]))
    if args.get("min_votes"):
        clauses.append("votes >= ?")
        values.append(int(args["min_votes"]))
    if args.get("date_from"):
        clauses.append("timestamp >= ?")
        values.append(args["date_from"])
    if args.get("date_to"):
        clauses.append("timestamp <= ?")
        values.append(args["date_to"])
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where, values


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/report", methods=["POST"])
def report():
    form = request.form
    lat = float(form.get("latitude", 0))
    lon = float(form.get("longitude", 0))
    incident_type = form.get("type", "")
    severity = form.get("severity", "Low")
    description = form.get("description", "").strip()
    blockage_range = form.get("blockage_range_m")
    authority_assigned = 1 if form.get("authority_assigned") == "true" else 0
    authority_name = form.get("authority_name", "").strip() or None
    estimated_resolution_minutes = form.get("estimated_resolution_minutes")
    casualties = int(form.get("casualties", 0) or 0)

    if not incident_type or not description:
        return jsonify({"error": "Missing required fields"}), 400

    blockage_range_value = float(blockage_range) if blockage_range else None
    estimated_resolution_value = int(estimated_resolution_minutes) if estimated_resolution_minutes else None
    if incident_type == "Road Block" and blockage_range_value is not None and blockage_range_value >= 10:
        severity = "Critical"

    photo_url = None
    file = request.files.get("photo")
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
        filename = f"{uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        file.save(path)
        photo_url = f"/uploads/{filename}"

    now = datetime.now(timezone.utc)
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO incidents (
                latitude, longitude, type, severity, description, photo_url, timestamp, status, votes,
                blockage_range_m, authority_assigned, authority_name, estimated_resolution_minutes, casualties
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 0, ?, ?, ?, ?, ?)
            """,
            (
                lat,
                lon,
                incident_type,
                severity,
                description,
                photo_url,
                now.isoformat(),
                blockage_range_value,
                authority_assigned,
                authority_name,
                estimated_resolution_value,
                casualties,
            ),
        )
        incident_id = cur.lastrowid
        maybe_verify_incident(conn, lat, lon, now)
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    where, values = filters_clause(request.args)
    with get_db() as conn:
        maybe_escalate(conn)
        rows = conn.execute(f"SELECT * FROM incidents {where}", values).fetchall()
    incidents = [row_to_dict(r) for r in rows]
    incidents.sort(key=lambda x: (x["severity_rank"], x["timestamp"]), reverse=True)
    return jsonify(incidents)


@app.route("/api/map", methods=["GET"])
def map_data():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM incidents").fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/history", methods=["GET"])
def history():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 100"
        ).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/incidents/<int:incident_id>/resolve", methods=["PATCH"])
def resolve_incident(incident_id):
    with get_db() as conn:
        conn.execute(
            "UPDATE incidents SET status = 'Resolved', resolved_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), incident_id),
        )
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/incidents/<int:incident_id>/under-response", methods=["PATCH"])
def under_response_incident(incident_id):
    with get_db() as conn:
        conn.execute("UPDATE incidents SET status = 'Under Response' WHERE id = ?", (incident_id,))
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/vote", methods=["POST"])
def vote():
    data = request.get_json(silent=True) or {}
    incident_id = data.get("id")
    delta = int(data.get("delta", 0))
    if delta not in (-1, 1):
        return jsonify({"error": "Invalid vote"}), 400
    with get_db() as conn:
        conn.execute("UPDATE incidents SET votes = votes + ? WHERE id = ?", (delta, incident_id))
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM incidents").fetchall()
    rows_dict = [dict(r) for r in rows]
    total = len(rows_dict)
    critical = sum(1 for i in rows_dict if i["severity"] == "Critical")
    response_times = []
    for i in rows_dict:
        if i["resolved_at"]:
            start = datetime.fromisoformat(i["timestamp"])
            end = datetime.fromisoformat(i["resolved_at"])
            response_times.append((end - start).total_seconds() / 60)
    avg = round(sum(response_times) / len(response_times), 1) if response_times else 0
    rows_dict.sort(key=lambda x: (severity_order(x["severity"]), x["timestamp"]), reverse=True)
    return jsonify(
        {
            "total": total,
            "critical": critical,
            "average_response_time": avg,
            "incidents": [
                {
                    **i,
                    "severity_rank": severity_order(i["severity"]),
                    "estimated_response_time": f"{i['estimated_resolution_minutes'] or ({'Critical': 30, 'Medium': 60, 'Low': 120}.get(i['severity'], 90))} mins",
                }
                for i in rows_dict
            ],
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5004, debug=True)
else:
    init_db()