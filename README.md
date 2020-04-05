Flöde

Klient gör ett HTTP GET request mot /client ihop med nuvarande ID || null, och får tillbaka ett ID.

Klient ansluter mot websocket för den grupp den vill ställa sig i kö för; exempelvis /chat/vent/${client_ID}

När klienten har någon att prata med så skriver servern i socket ett meddelande. Snarlikt nedan
{
  type: "status",
  data: {
    connection: "established"
  }
}

Klienten har då möjlighet att skicka meddelanden, snarlikt nedan:
{
  type: "message",
  data: {
    message: "Hej! Läget?"
  }
}

Ifall mottagarklienten bryter anslutning kan servern skicka nedan till klient:
{
  type: "status",
  data: {
    connection: "absent"
  }
}

data.connection bör kunna vara 'established', 'absent', eller 'ended'.
Ended är avsiktligt avslut.
Absent är oavsiktligta avslut.
Established är att koppling finns och är tillgänglig.

På server sidan antar vi att en timeout sker efter oavsiktligt avslut för att sedan sätta status till 'ended'.
