import { useState } from "react";
import { useGetMessages, useSendMessage, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export function Messages() {
  const [context, setContext] = useState<'manager' | 'p2p' | 'support'>('manager');
  const [contextId, setContextId] = useState<string | undefined>(undefined);
  const [newMessage, setNewMessage] = useState("");
  
  const { data: messages, isLoading } = useGetMessages({ context, contextId });
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessage.mutate({
      data: {
        content: newMessage,
        context,
        contextId
      }
    }, {
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey({ context, contextId }) });
      }
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with your manager, P2P partners, and support</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Sidebar */}
        <Card className="w-full md:w-64 shrink-0 flex flex-col border-border rounded-xl overflow-hidden">
          <div className="p-2">
            <Tabs value={context} onValueChange={(v: any) => { setContext(v); setContextId(undefined); }} className="w-full">
              <TabsList className="w-full flex flex-col h-auto bg-transparent space-y-1">
                <TabsTrigger value="manager" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2 px-3">
                  Account Manager
                </TabsTrigger>
                <TabsTrigger value="p2p" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2 px-3">
                  P2P Trades
                </TabsTrigger>
                <TabsTrigger value="support" className="w-full justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2 px-3">
                  Support
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-h-0 border-border rounded-xl overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading messages...</div>
            ) : messages?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No messages in this conversation.</div>
            ) : (
              <div className="space-y-4">
                {messages?.map(msg => {
                  const isMe = msg.isFromUser;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.senderAvatar || undefined} />
                          <AvatarFallback className="bg-secondary text-xs"><UserIcon className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                      }`}>
                        {!isMe && <div className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</div>}
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-4 bg-muted/30 border-t border-border">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={`Message ${context}...`}
                className="flex-1"
                disabled={sendMessage.isPending}
              />
              <Button type="submit" disabled={!newMessage.trim() || sendMessage.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
