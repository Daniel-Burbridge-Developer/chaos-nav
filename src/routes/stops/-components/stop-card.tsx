const resolveStopLookup = async (
  stopNumber: string
): Promise<{ error?: string; data?: any }> => {
  try {
    const response = await fetch(`/api/bus-stop-lookup/${stopNumber}`);
    if (!response.ok) {
      return { error: `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    console.log("Stop data fetched:", data);
    return { data };
  } catch (error: any) {
    return { error: error.message || "Unknown error" };
  }
};
