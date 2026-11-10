package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.domain.enumeration.MemberStatus;
import com.mycompany.myapp.service.MemberService;
import com.mycompany.myapp.service.dto.MemberDTO;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * API des membres. Via le gateway : /services/movexa-back1/api/members
 */
@RestController
@RequestMapping("/api/members")
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);
    private static final String ENTITY_NAME = "member";

    @Value("${spring.application.name}")
    private String applicationName;

    private final MemberService memberService;

    public MemberResource(MemberService memberService) {
        this.memberService = memberService;
    }

    /**
     * GET /api/members?page=0&size=20&sort=id,asc&status=ACTIVE
     * Le nombre total d'éléments est renvoyé dans l'en-tête X-Total-Count.
     */
    @GetMapping("")
    public ResponseEntity<List<MemberDTO>> getAllMembers(
        @RequestParam(required = false) MemberStatus status,
        @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        LOG.debug("REST : liste des membres, status={}, {}", status, pageable);
        Page<MemberDTO> page = memberService.findAll(status, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO> getMember(@PathVariable Long id) {
        return ResponseUtil.wrapOrNotFound(memberService.findOne(id));
    }

    @PostMapping("")
    public ResponseEntity<MemberDTO> createMember(@Valid @RequestBody MemberDTO dto) throws URISyntaxException {
        if (dto.getId() != null) {
            throw new BadRequestAlertException("Un nouveau membre ne peut pas déjà avoir un id", ENTITY_NAME, "idexists");
        }
        MemberDTO result = memberService.create(dto);
        return ResponseEntity.created(new URI("/api/members/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, false, ENTITY_NAME, result.getId().toString()))
            .body(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberDTO> updateMember(@PathVariable Long id, @Valid @RequestBody MemberDTO dto) {
        if (dto.getId() != null && !dto.getId().equals(id)) {
            throw new BadRequestAlertException("L'id du corps ne correspond pas à celui de l'URL", ENTITY_NAME, "idinvalid");
        }
        return ResponseUtil.wrapOrNotFound(
            memberService.update(id, dto),
            HeaderUtil.createEntityUpdateAlert(applicationName, false, ENTITY_NAME, id.toString())
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        if (!memberService.delete(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, false, ENTITY_NAME, id.toString()))
            .build();
    }
}
