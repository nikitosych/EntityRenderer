const encoder = new TextEncoder();
const algorithm = { name: "HMAC", hash: "SHA-256" };

export default async function verifySignature(secret, header, payload) {
    try {
        const sigHex = header.split("=")[1];
        const sigBytes = hexToBytes(sigHex);
        const key = await importKey(secret);

        const dataBytes = encoder.encode(payload);
        const isValid = await crypto.subtle.verify(
            algorithm,
            key,
            sigBytes,
            dataBytes,
        );

        return isValid;
    } catch (error) {
        console.error("Verification failed:", error);
        return false;
    }
}

async function importKey(secret) {
    const keyBytes = encoder.encode(secret);
    return crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        false, // не извлеекается
        ["verify"]
    );
}

function hexToBytes(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}
