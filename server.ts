import app from './index.js';
import {initializeDB} from "./db/db.js";

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    await initializeDB();
    console.log(`Listening at http://localhost:${PORT}`);
});