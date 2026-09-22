"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { search, type SearchResult } from "@/actions/search";

const EMPTY_RESULT: SearchResult = { projects: [], tasks: [] };

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULT);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      search(trimmed).then((result) => {
        setResults(result);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults(EMPTY_RESULT);
    }
  }

  function goTo(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const hasResults = results.projects.length > 0 || results.tasks.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Search
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search projects and tasks…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!hasResults ? (
            <CommandEmpty>{loading ? "Searching…" : "No results found."}</CommandEmpty>
          ) : null}
          {results.projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {results.projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name}-${project.id}`}
                  onSelect={() => goTo(`/projects/${project.slug}`)}
                >
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.tasks.length > 0 ? (
            <CommandGroup heading="Tasks">
              {results.tasks.map((task) => (
                <CommandItem
                  key={task.id}
                  value={`${task.title}-${task.id}`}
                  onSelect={() => goTo(`/projects/${task.projectSlug}`)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{task.projectName}</span>
                    <span>{task.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
