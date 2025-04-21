import { useState } from "preact/hooks";

const isDev = import.meta.env.DEV;

interface Props {
	year: string;
	month: string;
	day: string;
}

export default function ContextModal({ year, month, day }: Props) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const apiUrl = `/api/context/${year}/${month}/${day}`;

	async function handleClick() {
		if (open) return setOpen(false); // toggle close if already open
		setOpen(true);
		setLoading(true);
		setError(null);
		try {
			const resp = await fetch(apiUrl);
			if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
			const json = await resp.json();
			setData(JSON.stringify(json, null, 2));
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			{isDev && (
				<button
					type="button"
					onClick={handleClick}
					class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
				>
					{open ? "Hide Context" : "View Raw Context"}
				</button>
			)}

			{open && (
				<div
					id="context-modal"
					class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
				>
					<div class="bg-white p-6 max-w-4xl max-h-[90vh] w-full overflow-auto rounded-lg shadow-xl">
						<h2 class="text-xl font-bold mb-4">Raw Context</h2>
						{loading && <p>Loading...</p>}
						{error && <pre class="text-red-600">{error}</pre>}
						{!loading && !error && (
							<pre
								id="context-pre"
								class="text-sm bg-gray-100 p-4 rounded overflow-auto max-h-[70vh]"
							>
								{data}
							</pre>
						)}
						<button
							type="button"
							onClick={() => setOpen(false)}
							class="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
						>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
