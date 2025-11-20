import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Users as UsersIcon } from "lucide-react";
import { useState } from "react";

interface Contact {
  id: string;
  name: string;
  role: string;
  zone: string;
  status: "online" | "offline";
  unread: number;
  isGroup?: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export const MessagingPanel = () => {
  const [contacts] = useState<Contact[]>([
    {
      id: "1",
      name: "Carlos Mendoza",
      role: "Guardabosque Jefe",
      zone: "Zona Norte",
      status: "online",
      unread: 2
    },
    {
      id: "2",
      name: "Ana García",
      role: "Guardabosque",
      zone: "Zona Sur",
      status: "online",
      unread: 0
    },
    {
      id: "3",
      name: "Jorge Silva",
      role: "Guardabosque",
      zone: "Zona Este",
      status: "offline",
      unread: 1
    },
    {
      id: "4",
      name: "María Torres",
      role: "Coordinadora",
      zone: "Central",
      status: "online",
      unread: 0
    },
    {
      id: "5",
      name: "Grupo Emergencias",
      role: "Canal Grupal",
      zone: "Todos",
      status: "online",
      unread: 5,
      isGroup: true
    }
  ]);

  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "Carlos Mendoza",
      content: "Confirmado, el sensor infrarrojo en B3 detectó movimiento. Me dirijo al área.",
      timestamp: "10:45 AM",
      isOwn: false
    },
    {
      id: "2",
      sender: "Tú",
      content: "Perfecto Carlos, mantennos informados. ¿Necesitas apoyo adicional?",
      timestamp: "10:47 AM",
      isOwn: true
    },
    {
      id: "3",
      sender: "Carlos Mendoza",
      content: "Por ahora estoy bien, parece ser fauna local. Realizaré inspección completa.",
      timestamp: "10:50 AM",
      isOwn: false
    },
    {
      id: "4",
      sender: "Tú",
      content: "Entendido. Cualquier novedad, repórtala de inmediato.",
      timestamp: "10:51 AM",
      isOwn: true
    }
  ]);

  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: "Tú",
        content: newMessage,
        timestamp: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
        isOwn: true
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Lista de Contactos */}
      <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Contactos</CardTitle>
          <CardDescription>Guardabosques y personal activo</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-1 p-4">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 hover:bg-muted ${
                    selectedContact.id === contact.id ? "bg-primary/10 border-2 border-primary" : "border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className={`${contact.isGroup ? "bg-accent" : "bg-primary"} text-primary-foreground`}>
                          {contact.isGroup ? <UsersIcon className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      {contact.status === "online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate">{contact.name}</p>
                        {contact.unread > 0 && (
                          <Badge variant="destructive" className="ml-2 shrink-0">
                            {contact.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.zone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Panel de Mensajes */}
      <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className={`${selectedContact.isGroup ? "bg-accent" : "bg-primary"} text-primary-foreground`}>
                {selectedContact.isGroup ? <UsersIcon className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedContact.status === "online" ? "bg-primary" : "bg-muted-foreground"}`} />
                {selectedContact.status === "online" ? "En línea" : "Desconectado"} • {selectedContact.zone}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[450px] p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? "justify-end" : "justify-start"} animate-slide-in-bottom`}
                >
                  <div className={`max-w-[70%] ${message.isOwn ? "order-2" : "order-1"}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {!message.isOwn && (
                        <p className="text-xs font-semibold mb-1 text-primary">{message.sender}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={sendMessage} size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

