import app from './index.ts';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
});