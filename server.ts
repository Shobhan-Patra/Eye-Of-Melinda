import app from './index.ts';
import {initializeDB} from "./db/db.ts";

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    await initializeDB();
    console.log(`Listening at http://localhost:${PORT}`);
});