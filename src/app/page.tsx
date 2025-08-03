"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateTranscript } from "@/ai/flows/generate-transcript";
import { translateText } from "@/ai/flows/translate-text";
import { transliterateText } from "@/ai/flows/transliterate-text";
import { summarizeText } from "@/ai/flows/summarize-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/file-uploader";
import { FileText, Languages, SpellCheck, BookText, Clipboard, Check, Mic, Square, Upload, MicOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const languages = [
  { value: "English", label: "English", script: "Latin" },
  { value: "Hindi", label: "Hindi", script: "Devanagari" },
  { value: "Marathi", label: "Marathi", script: "Devanagari" },
  { value: "Tamil", label: "Tamil", script: "Tamil" },
  { value: "Telugu", label: "Telugu", script: "Telugu" },
  { value: "Kannada", label: "Kannada", script: "Kannada" },
];

const readFileAsDataURI = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const ResultTabContent = ({ content, isLoading, title }: { content: string, isLoading: boolean, title: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      if(!content) return;
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const hasContent = content && content.length > 0;

    return (
      <div className="relative mt-2">
        {isLoading && (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        )}
        {!isLoading && !hasContent && (
          <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed bg-card text-center text-muted-foreground">
            <p className="font-semibold">No {title} to display</p>
            <p className="text-sm">Provide a file or recording to get started</p>
          </div>
        )}
        {!isLoading && hasContent && (
          <>
            <Textarea
              readOnly
              value={content}
              className="h-64 resize-y bg-card"
              aria-label={title}
            />
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
              <span className="sr-only">Copy {title}</span>
            </Button>
          </>
        )}
      </div>
    );
};

const AudioRecorder = ({ onRecordingComplete, disabled }: { onRecordingComplete: (blob: Blob) => void, disabled: boolean }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setHasPermission(true);
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(audioBlob);
          audioChunksRef.current = [];
        };
      })
      .catch(err => {
        console.error("Error accessing microphone:", err);
        setHasPermission(false);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please enable microphone permissions in your browser settings.",
        });
      });
  }, [toast, onRecordingComplete]);

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const toggleRecording = () => {
    if(disabled) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (hasPermission === null) {
    return <div className="flex items-center justify-center h-48"><p>Requesting microphone permission...</p></div>;
  }
  
  if (hasPermission === false) {
    return (
       <Alert variant="destructive" className="mt-4">
        <MicOff className="h-4 w-4" />
        <AlertTitle>Microphone Access Required</AlertTitle>
        <AlertDescription>
          Please grant microphone access in your browser to use the recording feature.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-48">
        <p className="text-muted-foreground">{isRecording ? "Recording in progress..." : "Click the button to start recording"}</p>
        <Button onClick={toggleRecording} size="lg" disabled={disabled} className="w-40">
          {isRecording ? <><Square className="mr-2" /> Stop</> : <><Mic className="mr-2" /> Record</>}
        </Button>
    </div>
  );
};


export default function VoiceScribeAI() {
  const { toast } = useToast();
  const [dataSource, setDataSource] = useState<File | Blob | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0].value);
  
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [summary, setSummary] = useState("");

  const [loading, setLoading] = useState({
    transcript: false,
    downstream: false,
  });

  const isProcessing = loading.transcript || loading.downstream;
  const selectedScript = useMemo(() => languages.find(l => l.value === selectedLanguage)?.script || "Latin", [selectedLanguage]);

  useEffect(() => {
    if (!dataSource) return;

    const processFile = async () => {
      setLoading({ transcript: true, downstream: false });
      setTranscript("");
      setTranslation("");
      setTransliteration("");
      setSummary("");

      try {
        const audioVideoDataUri = await readFileAsDataURI(dataSource);
        const { transcript: generatedTranscript } = await generateTranscript({ audioVideoDataUri });
        setTranscript(generatedTranscript);
        setLoading({ transcript: false, downstream: true });
      } catch (error) {
        console.error("Error generating transcript:", error);
        toast({
          variant: "destructive",
          title: "Transcription Failed",
          description: "Could not generate transcript from the provided file.",
        });
        setLoading({ transcript: false, downstream: false });
      }
    };

    processFile();
  }, [dataSource, toast]);

  useEffect(() => {
    if (!transcript || !loading.downstream) return;

    const processDownstreamTasks = async () => {
      try {
        await Promise.all([
          (async () => {
            const { translatedText } = await translateText({ text: transcript, targetLanguage: selectedLanguage });
            setTranslation(translatedText);
          })(),
          (async () => {
            const { transliteratedText } = await transliterateText({ text: transcript, targetScript: selectedScript });
            setTransliteration(transliteratedText);
          })(),
          (async () => {
            const { summary: generatedSummary } = await summarizeText({ text: transcript });
            setSummary(generatedSummary);
          })(),
        ]);
      } catch (error) {
        console.error("Error in downstream AI tasks:", error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: "One or more AI tasks failed after transcription.",
        });
      } finally {
        setLoading(prev => ({ ...prev, downstream: false }));
      }
    };

    processDownstreamTasks();
  }, [transcript, selectedLanguage, selectedScript, loading.downstream, toast]);

  return (
    <div className="container mx-auto max-w-7xl p-4 py-8 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl font-headline">VoiceScribeAI</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Upload or record audio, get transcripts, translations, and more.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>1. Provide Audio</CardTitle>
              <CardDescription>Upload a file or record audio from your mic.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload File</TabsTrigger>
                  <TabsTrigger value="record"><Mic className="mr-2 h-4 w-4"/>Record Audio</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="pt-4">
                  <FileUploader onFileSelect={setDataSource} disabled={isProcessing} />
                </TabsContent>
                <TabsContent value="record" className="pt-4">
                  <AudioRecorder onRecordingComplete={setDataSource} disabled={isProcessing} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Select Language</CardTitle>
              <CardDescription>Choose the output language for translation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="language-select">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isProcessing}>
                  <SelectTrigger id="language-select">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="transcript"><FileText className="mr-2 h-4 w-4"/>Transcript</TabsTrigger>
              <TabsTrigger value="translation"><Languages className="mr-2 h-4 w-4"/>Translation</TabsTrigger>
              <TabsTrigger value="transliteration"><SpellCheck className="mr-2 h-4 w-4"/>Transliteration</TabsTrigger>
              <TabsTrigger value="summary"><BookText className="mr-2 h-4 w-4"/>Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript">
                <ResultTabContent content={transcript} isLoading={loading.transcript} title="transcript" />
            </TabsContent>
            <TabsContent value="translation">
                <ResultTabContent content={translation} isLoading={loading.downstream} title="translation" />
            </TabsContent>
            <TabsContent value="transliteration">
                <ResultTabContent content={transliteration} isLoading={loading.downstream} title="transliteration" />
            </TabsContent>
            <TabsContent value="summary">
                <ResultTabContent content={summary} isLoading={loading.downstream} title="summary" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

    