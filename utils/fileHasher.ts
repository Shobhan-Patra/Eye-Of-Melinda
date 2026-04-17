import * as fs from "fs";
import * as crypto from "crypto";

const getHash = async (path: string) => {
    try {
        const hash = crypto.createHash('sha256');
        const rs = fs.createReadStream(path);

        for await (const chunk of rs) {
            hash.update(chunk);
        }

        return hash.digest('hex');
    } catch (error) {
        console.error("Error while calculating hash: ", error);
    }
}

export default getHash;