import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/shadCnLibrary";
import { z } from "zod";
import useDebounce from "~/hooks/useDebounce";
import { useEffect, useState } from "react";
import { Stop } from "~/db/schema/stops";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { FC } from "react";

const stopLookupSchema = z.object({
  stop: z.string().length(5, "Stop number must be exactly 5 characters long"),
});

interface StopLookupProps {
  onLookupResult?: (result: Stop | null) => void;
}

// ADD FUNCTIONALITY TO RESOLVE BUS STOP LOOKUP

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

const fetchSuggestions = async (debouncedInput: string) => {
  const response = await fetch(`/api/busstop-infoFts5/${debouncedInput}`);
  if (!response.ok) throw new Error("Failed to fetch suggestions");
  const { data } = await response.json();
  return data || [];
};

const StopLookup: FC<StopLookupProps> = ({ onLookupResult }) => {
  const [inputValue, setInputValue] = useState("");
  const debouncedInput = useDebounce(inputValue, 300);

  const {
    data: suggestions = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["busstop-suggestions", debouncedInput],
    queryFn: () => fetchSuggestions(debouncedInput),
    enabled: debouncedInput.length >= 3,
    staleTime: 1000 * 60, // 1 minute, adjust as needed
  });

  const form = useForm({
    validators: {
      onSubmit: stopLookupSchema,
    },
    defaultValues: {
      stop: "",
    },
    onSubmit: async ({ value }) => {
      const result = await resolveStopLookup(value.stop);
      if (result.error) {
        console.error("Error fetching stop data:", result.error);
        onLookupResult?.(null);
      } else {
        console.log("Stop data fetched successfully:");
        onLookupResult?.(result.data || null);
        form.reset();
        setInputValue("");
      }
    },
  });

  const handleSuggestions = (user_input: string) => {
    setInputValue(user_input);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="stop">
        {(field) => (
          <div>
            <Input
              type="text"
              name={field.name}
              placeholder="Enter stop number or name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => {
                field.setValue(e.target.value);
                handleSuggestions(e.target.value);
              }}
              autoFocus
            />
            {isFetching && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Loading"
              >
                <Loader className="w-5 h-5 animate-spin" />
              </span>
            )}
            {field.state.meta.isDirty && field.state.meta.errors.length > 0 && (
              <em className="text-red-500">
                {field.state.meta.errors
                  .map((error) => error?.message)
                  .join(", ")}
              </em>
            )}
            {suggestions.length > 0 && (
              <ul className="bg-white text-black rounded shadow mt-2">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                    onClick={() => {
                      field.setValue(s.number);
                      setInputValue(s.number);
                      form.handleSubmit();
                    }}
                  >
                    {s.name} ({s.number})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form.Field>
    </form>
  );
};

export default StopLookup;
