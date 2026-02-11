
export const onRequestGet = async (context: any) => {
    try {
        const list = await context.env.RESEARCH_KV.list({ limit: 50 });
        const items = list.keys.map((key: any) => ({
            filename: key.name,
            ...(key.metadata || {})
        })).sort((a: any, b: any) => {
            const dateA = a.created ? new Date(a.created).getTime() : 0;
            const dateB = b.created ? new Date(b.created).getTime() : 0;
            return dateB - dateA;
        });

        return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
