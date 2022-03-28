import sqlite3

filename = "testsdb.db" 
connection = sqlite3.connect(filename)

query = """
SELECT * 
FROM test
"""

result = connection.execute(query)
print(result.fetchall())