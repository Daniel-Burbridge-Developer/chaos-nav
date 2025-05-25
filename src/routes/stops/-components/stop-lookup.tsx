import { useForm } from "@tanstack/react-form";
import { Input } from "~/components/ui/shadCnLibrary";
import { set, z } from "zod";
import useDebounce from "~/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { FC } from "react";
import { useState } from "react";

const stopLookupSchema = z.object({
  stop: z
    .string()
    .length(5, "Stop number must be exactly 5 digits long")
    .regex(/^\d{5}$/, "Stop number must be exactly 5 digits and numeric"),
});

interface StopLookupProps {
  onFormSubmit?: (stop: string) => void;
}

const fetchSuggestions = async (debouncedInput: string) => {
  console.log("Fetching suggestions for:", debouncedInput);
  const response = await fetch(`/api/busstop-info/${debouncedInput}`);
  if (!response.ok) throw new Error("Failed to fetch suggestions");
  const { data } = await response.json();
  return data || [];
};

const StopLookup: FC<StopLookupProps> = ({ onFormSubmit }) => {
  const [inputValue, setInputValue] = useState("");
  const form = useForm({
    validators: {
      onSubmit: stopLookupSchema,
    },
    defaultValues: {
      stop: "",
    },
    onSubmit: async ({ value }) => {
      onFormSubmit?.(value.stop);
      form.reset();
      setInputValue(""); // Clear input after submission
    },
  });

  const normalizedInput = inputValue.replace(/\s/g, "");
  const debouncedInput = useDebounce(normalizedInput, 300);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["busstop-suggestions", debouncedInput],
    queryFn: () => fetchSuggestions(debouncedInput),
    enabled: debouncedInput.length >= 3,
    staleTime: 100000 * 60, // 100 minute
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="stop">
        {(field) => (
          <div className="relative">
            <Input
              type="text"
              name={field.name}
              placeholder="Enter stop number"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => {
                field.setValue(e.target.value);
                setInputValue(e.target.value);
              }}
              autoFocus
              autoComplete="off"
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
              <ul className="bg-white text-black rounded shadow mt-2 z-10 absolute w-full">
                {suggestions.map((s: any) => (
                  <li
                    key={s.id}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                    onClick={() => {
                      field.setValue(s.number);
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
