package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.service.ReminderService;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderDTO;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderQueueItem;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderSendRequest;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderStatsDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Relances des membres : liste du jour, envoi, historique et résultats. */
@RestController
@RequestMapping("/api/reminders")
public class ReminderResource {

    private final ReminderService reminderService;

    public ReminderResource(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @GetMapping("/queue")
    public List<ReminderQueueItem> queue() {
        return reminderService.queue();
    }

    /** POST /api/reminders/compose : messages prêts pour les membres cochés dans la liste (max 200). */
    @PostMapping("/compose")
    public List<ReminderQueueItem> compose(@RequestBody List<Long> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) return List.of();
        if (memberIds.size() > 200) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "200 membres au maximum par relance groupée.");
        return reminderService.compose(memberIds);
    }

    /** POST /api/reminders : enregistre une relance envoyée depuis le téléphone (wa.me ou SMS). */
    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderDTO send(@Valid @RequestBody ReminderSendRequest request) {
        return reminderService.send(request);
    }

    @GetMapping("/history")
    public List<ReminderDTO> history(@RequestParam(defaultValue = "30") int days) {
        return reminderService.history(Math.min(days, 365));
    }

    @GetMapping("/stats")
    public ReminderStatsDTO stats() {
        return reminderService.stats();
    }
}
