import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCardState } from "./getCardState";
import { StatusIcon } from "./StatusIcon";
import { Checkin, MessageRequest, PlaceId, UserId } from "@/lib/types/database";

// type only used here
export type UserCheckInCardProps = {
  checkin: Checkin;
  currentUserId: UserId;
  placeId: PlaceId;
  requests: MessageRequest[];
  hasActiveSession: boolean;
  onSendRequest: () => void;
  onResumeSession?: () => void;
  isRequestPending: boolean;
};

export default function UserCheckInCard(props: UserCheckInCardProps) {
  const cardState = getCardState(props);

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          {props.checkin.topic || "Open to chat"}
          <StatusIcon
            type={cardState.icon === "message" ? null : cardState.icon}
          />
        </div>
        <p className="text-muted-foreground text-sm capitalize">
          {props.checkin.checkinStatus}
        </p>
      </div>

      <Button
        variant={cardState.variant}
        disabled={cardState.disabled}
        onClick={cardState.onClick}
        className="shrink-0"
      >
        {cardState.icon === "message" && <StatusIcon type="message" />}
        {cardState.text}
      </Button>
    </Card>
  );
}
