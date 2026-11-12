package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.domain.JobRun;
import com.mycompany.myapp.security.AuthoritiesConstants;
import com.mycompany.myapp.service.ProspectService;
import com.mycompany.myapp.service.dto.ProspectDtos.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Prospects : ajout rapide, relances, chance d'adhésion, conversion. */
@RestController
@RequestMapping("/api/prospects")
public class ProspectResource {

    private final ProspectService prospectService;

    public ProspectResource(ProspectService prospectService) {
        this.prospectService = prospectService;
    }

    /** GET /api/prospects?scope=TODAY|OPEN|CLOSED */
    @GetMapping("")
    public List<ProspectDTO> list(@RequestParam(defaultValue = "OPEN") String scope) {
        return prospectService.list(scope);
    }

    @GetMapping("/search")
    public List<ProspectDTO> search(@RequestParam("q") String q) {
        return prospectService.search(q);
    }

    /** Compteurs anonymes : quelles sources ramènent des membres. */
    @GetMapping("/stats")
    public List<SourceStatsDTO> stats() {
        return prospectService.stats();
    }

    @GetMapping("/{id}")
    public ProspectDTO get(@PathVariable Long id) {
        return prospectService.get(id);
    }

    @GetMapping("/{id}/events")
    public List<ProspectEventDTO> events(@PathVariable Long id) {
        return prospectService.events(id);
    }

    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public ProspectDTO create(@Valid @RequestBody ProspectRequest request) {
        return prospectService.create(request);
    }

    @PutMapping("/{id}")
    public ProspectDTO update(@PathVariable Long id, @Valid @RequestBody ProspectRequest request) {
        return prospectService.update(id, request);
    }

    /** Le prospect a répondu, demandé un tarif / visité, ou fait une séance d'essai. */
    @PostMapping("/{id}/interactions")
    public ProspectDTO interaction(@PathVariable Long id, @Valid @RequestBody InteractionRequest request) {
        return prospectService.interaction(id, request.type());
    }

    /** Relance envoyée (WhatsApp ou SMS) : planifie la suivante. */
    @PostMapping("/{id}/follow-ups")
    public ProspectDTO followUp(@PathVariable Long id, @Valid @RequestBody FollowUpRequest request) {
        return prospectService.followUp(id, request.channel());
    }

    @PostMapping("/{id}/lost")
    public ProspectDTO lose(@PathVariable Long id) {
        return prospectService.lose(id);
    }

    /** Lance à la main le nettoyage quotidien (normalement automatique à 2 h). Une fois par jour. */
    @PostMapping("/decay")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public JobRun runDecay() {
        return prospectService.runDecay();
    }
}
