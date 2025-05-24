import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/shadCnLibrary";
import { z } from "zod";
import useDebounce from "~/hooks/useDebounce";
import { useEffect, useState } from "react";
import { Stop } from "~/db/schema/stops";

const stopLookupSchema = z.object({
  stop: z.string().length(5, "Stop number must be exactly 5 characters long"),
});

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
    return { data };
  } catch (error: any) {
    return { error: error.message || "Unknown error" };
  }
};

const StopLookup = () => {
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [inputValue, setInputValue] = useState("");

  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedInput.length < 3) {
      setSuggestions([]);
      return;
    }

    // Fetch suggestions from the API and update state
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/busstop-infoFts5/${debouncedInput}`);
        const { data } = await response.json();
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        setSuggestions(data || []);
        suggestions.length > 0
          ? console.log("Suggestions fetched successfully:", suggestions)
          : console.log("No suggestions found for input:", debouncedInput);
      } catch (error) {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
    return;
  }, [debouncedInput]);

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
      } else {
        console.log("Stop data fetched successfully:");
        form.reset();
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
