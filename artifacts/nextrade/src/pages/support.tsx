import { useState } from "react";
import { useGetSupportTickets, useCreateSupportTicket, getGetSupportTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LifeBuoy, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function Support() {
  const { data: tickets, isLoading } = useGetSupportTickets();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-muted-foreground mt-1">Get help with your account and trades</p>
        </div>
        <CreateTicketDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tickets</CardTitle>
          <CardDescription>Recent support requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : tickets?.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <LifeBuoy className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">You have no active support tickets.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {tickets?.map(ticket => (
                <AccordionItem value={ticket.id} key={ticket.id} className="border rounded-lg mb-4 px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold">{ticket.subject}</span>
                        <span className="text-xs text-muted-foreground font-normal mt-1">
                          Created {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ticket.priority === 'urgent' ? 'destructive' : ticket.priority === 'high' ? 'default' : 'secondary'} className="capitalize">
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className={
                          ticket.status === 'resolved' || ticket.status === 'closed' ? 'border-success text-success' :
                          ticket.status === 'in_progress' ? 'border-primary text-primary' : 'border-warning text-warning'
                        }>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 border-t">
                    <div className="space-y-4 mb-4 bg-muted/20 p-4 rounded-lg">
                      {ticket.messages.map((msg, _i) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isFromUser ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${msg.isFromUser ? 'bg-primary/10 text-foreground' : 'bg-muted'}`}>
                            <div className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</div>
                            <div className="text-sm">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                      <div className="flex justify-end">
                        <Link href={`/messages?context=support&contextId=${ticket.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2">
                          Reply in Messages
                        </Link>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<'low'|'medium'|'high'|'urgent'>('medium');
  
  const createTicket = useCreateSupportTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    createTicket.mutate({
      data: { subject, message, priority }
    }, {
      onSuccess: () => {
        toast({ title: "Ticket created", description: "Support team has been notified." });
        queryClient.invalidateQueries({ queryKey: getGetSupportTicketsQueryKey() });
        setOpen(false);
        setSubject("");
        setMessage("");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create ticket.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><AlertCircle className="h-4 w-4 mr-2" /> New Ticket</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Support Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of the issue" />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General inquiry</SelectItem>
                <SelectItem value="medium">Medium - Issue with an action</SelectItem>
                <SelectItem value="high">High - Missing funds/trades</SelectItem>
                <SelectItem value="urgent">Urgent - Account compromise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Provide details so we can assist you better..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!subject || !message || createTicket.isPending}>
            {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
