package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.security.AuthoritiesConstants;
import com.mycompany.myapp.service.PlanService;
import com.mycompany.myapp.service.dto.PlanDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tech.jhipster.web.util.ResponseUtil;

/** Catalogue des formules : lecture pour tous, création et modification par le gérant. */
@RestController
@RequestMapping("/api/plans")
public class PlanResource {

    private final PlanService planService;

    public PlanResource(PlanService planService) {
        this.planService = planService;
    }

    /** GET /api/plans (actives) ou /api/plans?all=true (y compris désactivées). */
    @GetMapping("")
    public List<PlanDTO> list(@RequestParam(defaultValue = "false") boolean all) {
        return planService.list(all);
    }

    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public PlanDTO create(@Valid @RequestBody PlanDTO dto) {
        return planService.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public ResponseEntity<PlanDTO> update(@PathVariable Long id, @Valid @RequestBody PlanDTO dto) {
        return ResponseUtil.wrapOrNotFound(planService.update(id, dto));
    }
}
