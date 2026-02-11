
export const onRequestGet = async (context: any) => {
    try {
        const filename = context.params.filename;

        // Security check for filename (only alphanumeric, _, ., -)
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(String(filename))) {
            return new Response(JSON.stringify({ error: 'Invalid filename' }), { status: 400 });
        }

        const data = await context.env.RESEARCH_KV.get(filename);

        if (!data) {
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        }

        return new Response(data, {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
