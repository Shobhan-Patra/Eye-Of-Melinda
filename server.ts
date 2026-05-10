import app from './index.js';
import {initializeDB} from "./db/db.js";
import {createUploadsDir} from "./utils/createUploadsDir.js";

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    await initializeDB();
    createUploadsDir();
    console.log(`Listening at http://localhost:${PORT}`);
});