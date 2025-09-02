"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg"></div>
            <span className="text-h3 font-semibold">ClientHandle</span>
          </Link>
        </div>

        <Card className="border-0 shadow-apple-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-h2 text-destructive">Authentication Error</CardTitle>
            <CardDescription className="text-body text-muted-foreground">
              Sorry, we couldn&apos;t sign you in. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-body-small text-muted-foreground">
              There was an error with your authentication request. This might happen if the link has expired or been used already.
            </p>
            
            <div className="flex gap-3">
              <Button asChild className="flex-1 h-12 animate-apple-press">
                <Link href="/sign-in">
                  Try Again
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12 animate-apple-press">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}