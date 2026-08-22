"use client";
import { useState } from "react";
import { Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SosButton() { const [sent, setSent] = useState(false); return <Button variant="danger" size="lg" className="h-28 w-28 rounded-full border-8 border-red-100 shadow-xl" onClick={() => setSent(true)}>{sent ? <span className="text-center text-sm">Alert<br/>sent</span> : <><Siren size={26}/><span>SOS</span></>}</Button>; }
