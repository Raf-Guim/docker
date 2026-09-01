async function getData(url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const nest = await getData(`${process.env.NEST_API_URL}/`);
  const fastapi = await getData(`${process.env.FASTAPI_URL}/`);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Docker base stack</h1>
      <p>Frontend: Next.js</p>
      <p>Nest backend says: {nest ? nest.message : 'unreachable'}</p>
      <p>FastAPI backend says: {fastapi ? fastapi.message : 'unreachable'}</p>
    </main>
  );
}
