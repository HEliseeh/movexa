package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.security.AuthoritiesConstants;
import com.mycompany.myapp.service.CoachService;
import com.mycompany.myapp.service.dto.CoachDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tech.jhipster.web.util.ResponseUtil;

/** Coachs : lecture pour tous (accueil, fiche membre), création, modification et suppression par le gérant. */
@RestController
@RequestMapping("/api/coaches")
public class CoachResource {

    private final CoachService coachService;

    public CoachResource(CoachService coachService) {
        this.coachService = coachService;
    }

    @GetMapping("")
    public List<CoachDTO> list() {
        return coachService.list();
    }

    /** GET /api/coaches/disciplines : disciplines déjà utilisées (suggestions) */
    @GetMapping("/disciplines")
    public List<String> disciplines() {
        return coachService.disciplines();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CoachDTO> get(@PathVariable Long id) {
        return ResponseUtil.wrapOrNotFound(coachService.findOne(id));
    }

    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public CoachDTO create(@Valid @RequestBody CoachDTO dto) {
        return coachService.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public ResponseEntity<CoachDTO> update(@PathVariable Long id, @Valid @RequestBody CoachDTO dto) {
        return ResponseUtil.wrapOrNotFound(coachService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public void delete(@PathVariable Long id) {
        coachService.delete(id);
    }
}
